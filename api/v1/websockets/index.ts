import http from 'http';
import * as cookie from 'cookie';
import express from 'express';
import jwt from 'jsonwebtoken';
import { Duplex } from 'stream';
import { WebSocketServer, WebSocket } from 'ws';

import { hasRegisteredDevices, changeState } from './dbController';

interface CustomRequest extends express.Request {
  userId?: string; // Optional userId property
}

const userConnections = new Map<string, WebSocket>();

export default function initWebSocketServer(
  server: http.Server
): WebSocketServer {
  // Create WebSocket Server
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket upgrade requests
  server.on('upgrade', (req: CustomRequest, socket: Duplex, head: Buffer) => {
    // console.log('Req headers:', req.headers);
    // console.log('Parsed cookies:', cookies);
    const response = new Promise<{ id: string; iat: number; exp: number }>(
      (resolve, reject) => {
        try {
          const cookies = cookie.parse(req.headers.cookie || '');
          const token = cookies['token'];
          if (!token || typeof token !== 'string') {
            throw Error('Unauthorized: No token provided');
          }
          const payload = jwt.verify(token, process.env.JWT_SECRET ?? '1d');
          resolve(payload as { id: string; iat: number; exp: number });
        } catch (err) {
          reject(err);
          // console.log('WebSocket upgrade failed:', err);
          // socket.destroy(); // unauthorized
        }
      }
    );
    // console.log('Req cookies:', req.cookies);

    response
      .then(async (data) => {
        // Step 1: Check if the user has registered devices
        if (!(await hasRegisteredDevices(data.id))) {
          throw new Error('Unauthorized: User has no registered devices');
        }

        // Step 2: User can connect if they have registered devices
        req.userId = data.id;
        wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
          wss.emit('connection', ws, req);
        });
      })
      .catch((err) => {
        // console.error('WebSocket upgrade failed:', err);
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy(); // unauthorized
      });
  });

  // Set up connection handler
  wss.on('connection', (ws: WebSocket, req: CustomRequest) => {
    console.log('\n✅ Client Connected:', req.userId);
    // Store the user connection
    userConnections.set(req.userId as string, ws);

    ws.on('message', async (message: Buffer) => {
      const messageString = message.toString(); // Convert Buffer to string
      // console.log(`\n📬 Message Received from ${req.userId}:`, messageString);

      // Step 1: Parse the message
      const { espId, switchId, state } = JSON.parse(messageString);

      // Step 2: Pass the data to changeState function
      const result = await changeState(
        req.userId as string,
        espId,
        switchId,
        state
      );

      // Step 3: Broadcast the result to all esp users
      if (result.status === 'success') {
        const response = { ...result } as Partial<typeof result>;
        delete response.users; // Remove users from the response to avoid sending it back

        result.users.forEach((userId) => {
          const client = userConnections.get(userId.toString());
          if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(response));
          } else {
            // Close the connection if it's not open
            client?.close();
            // Remove the user from the map
            userConnections.delete(userId.toString());
          }
        });
      } else {
        // Send back the error response to the client
        ws.send(JSON.stringify(result));
      }
    });

    ws.on('close', () => {
      console.log('\n❌ Client Disconnected:', req.userId);
    });
  });

  return wss;
}

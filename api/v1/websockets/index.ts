import http from 'http';
import * as cookie from 'cookie';
import express from 'express';
import jwt from 'jsonwebtoken';
import { Duplex } from 'stream';
import { WebSocketServer, WebSocket } from 'ws';

interface CustomRequest extends express.Request {
  userId?: string; // Optional userId property
}

export default function initWebSocketServer(
  server: http.Server
): WebSocketServer {
  // Create WebSocket Server
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket upgrade requests
  server.on('upgrade', (req: CustomRequest, socket: Duplex, head: Buffer) => {
    console.log('Req headers:', req.headers);
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
      .then((data) => {
        // console.log('\n!! WebSocket upgrade authorized !!\n');
        // console.log('Payload:', data);

        req.userId = data.id;
        wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
          wss.emit('connection', ws, req);
        });
      })
      .catch((err) => {
        console.error('WebSocket upgrade failed:', err);
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy(); // unauthorized
      });
  });

  // Set up connection handler
  wss.on('connection', (ws: WebSocket, req: CustomRequest) => {
    console.log('\n✅ Client Connected:', req.userId);

    ws.on('close', () => {
      console.log('\n❌ Client Disconnected:', req.userId);
    });
  });

  return wss;
}

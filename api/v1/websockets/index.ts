import http from 'http';
import * as cookie from 'cookie';
import express from 'express';
import jwt from 'jsonwebtoken';
import { Duplex } from 'stream';
import { WebSocketServer, WebSocket } from 'ws';

import {
  hasRegisteredDevices,
  isDeviceRegistered,
  makeDeviceOffline,
  changeState,
} from './dbController';

interface CustomRequest extends express.Request {
  userId?: string;
  isUser: boolean;
  users?: string[];
}

interface CustomWebsocket extends WebSocket {
  isAlive?: boolean;
}

const userConnections = new Map<string, WebSocket[]>();
const espConnections = new Map<string, WebSocket>();

type PromiseType = {
  id: string;
  iat: number;
  exp: number;
  isUser: boolean;
  users?: string[];
};

export default function initWebSocketServer(
  server: http.Server
): WebSocketServer {
  // Create WebSocket Server
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket upgrade requests
  server.on('upgrade', (req: CustomRequest, socket: Duplex, head: Buffer) => {
    // console.log('Req headers:', req.headers);
    // console.log('Parsed cookies:', cookies);
    const response = new Promise<PromiseType>((resolve, reject) => {
      try {
        const cookies = cookie.parse(req.headers.cookie || '');
        const token = cookies['token'];
        if (token || typeof token === 'string') {
          // throw Error('Unauthorized: No token provided');
          const payload = jwt.verify(token, process.env.JWT_SECRET ?? '1d');
          resolve({ ...(payload as PromiseType), isUser: true });
        } else {
          //   console.log('Req url:', req.url);
          if (!req.url.includes('/esp/')) {
            reject(new Error('Unauthorized: No token provided'));
          }
          isDeviceRegistered(req.url.split('/')[2])
            .then((espId) => {
              if (espId) {
                resolve({ ...espId, iat: 0, exp: 0, isUser: false });
              } else {
                reject(new Error('Unauthorized: Device not registered'));
              }
            })
            .catch(() =>
              reject(new Error('Unauthorized: Device not registered'))
            );
        }
      } catch (err) {
        reject(err);
        // console.log('WebSocket upgrade failed:', err);
        // socket.destroy(); // unauthorized
      }
    });
    // console.log('Req cookies:', req.cookies);

    response
      .then(async (data) => {
        if (data.isUser) {
          // Step 1: Check if the user has registered devices
          if (!(await hasRegisteredDevices(data.id))) {
            throw new Error('Unauthorized: User has no registered devices');
          }
          req.isUser = true;
        } else {
          req.isUser = false;
          if (data.users) req.users = data.users;
        }

        // Step 2: User can connect if they have registered devices || Device has owner
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
  wss.on('connection', (ws: CustomWebsocket, req: CustomRequest) => {
    console.log('\n✅ Client Connected:', req.userId);
    // Store the user connection
    if (req.isUser) {
      // Check if the user already has a connection
      if (userConnections.has(req.userId as string)) {
        const existingConnections = userConnections.get(req.userId as string);
        if (existingConnections) {
          existingConnections.push(ws);
          userConnections.set(req.userId as string, existingConnections);
        }
      } else {
        userConnections.set(req.userId as string, [ws]);
      }
    } else {
      ws.isAlive = true;
      ws.on('pong', heartbeat);
      espConnections.set(req.userId as string, ws);
      req.users?.forEach((user) => {
        const usr = userConnections.get(user);
        if (usr?.length) {
          usr.forEach((u) => {
            if (u.readyState === WebSocket.OPEN) {
              u.send(
                JSON.stringify({
                  status: 'info',
                  state: 'connected',
                  espId: req.userId,
                })
              );
            } else {
              u?.close(); // Close the connection if it's not open
              // Remove the client from the user's connections
              userConnections.set(
                user,
                usr.filter((c) => c !== u)
              );
            }
          });
        }
      });
    }

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

        const espClient = espConnections.get(result.deviceId);
        if (espClient) {
          if (espClient.readyState === WebSocket.OPEN) {
            const msg = `${result.switchIndex}?${result.state ? 1 : 0}`;
            console.log(msg);
            espClient.send(msg);
          } else {
            makeDeviceOffline(result.deviceId);
            espClient.close(); // Close the connection if it's not open
          }
        }

        delete response.users; // Remove users from the response to avoid sending it back
        delete response.deviceId; // Avoid sending the db registered espId back to user
        delete response.switchIndex;

        result.users.forEach((userId) => {
          const clients = userConnections.get(userId.toString());
          // Check if the clients exists
          if (clients?.length) {
            clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(response));
              } else {
                client?.close(); // Close the connection if it's not open
                // Remove the client from the user's connections
                userConnections.set(
                  userId.toString(),
                  clients.filter((c) => c !== client)
                );
              }
            });
          } else {
            // Remove the user from the map if no clients exist
            userConnections.delete(userId.toString());
          }
          //   if (client && client.readyState === WebSocket.OPEN) {
          //     client.send(JSON.stringify(response));
          //   } else {
          //     // Close the connection if it's not open
          //     client?.close();
          //     // Remove the user from the map
          //     userConnections.delete(userId.toString());
          //   }
        });
      } else {
        // Send back the error response to the client if result is an error
        ws.send(JSON.stringify(result));
      }
    });

    ws.on('close', () => {
      console.log('\n❌ Client Disconnected:', req.userId);
      // Remove the user connection
      const clients = userConnections.get(req.userId as string);
      if (!req.isUser) {
        makeDeviceOffline(req.userId as string);
        console.log('ESP Disconnected:', req.userId);
        req.users?.forEach((user) => {
          const usr = userConnections.get(user);
          if (usr?.length) {
            usr.forEach((u) => {
              if (u.readyState === WebSocket.OPEN) {
                u.send(
                  JSON.stringify({
                    status: 'info',
                    state: 'disconnected',
                    espId: req.userId,
                  })
                );
              } else {
                u?.close(); // Close the connection if it's not open
                // Remove the client from the user's connections
                userConnections.set(
                  user,
                  usr.filter((c) => c !== u)
                );
              }
            });
          }
        });
        espConnections.delete(req.userId as string);
      }
      if (clients?.length) {
        if (clients.length <= 1) {
          userConnections.delete(req.userId as string);
        } else {
          userConnections.set(
            req.userId as string,
            clients.filter((c) => c !== ws)
          );
        }
      } else {
        userConnections.delete(req.userId as string);
      }
    });
  });

  // Heartbeat for the esp/device online check (ping function)
  const interval = setInterval(function () {
    for (const [espId, ws] of espConnections.entries()) {
      const customWs = ws as CustomWebsocket;
      if (!customWs.isAlive) {
        console.log(`Disconnecting... ${espId}`);
        // makeDeviceOffline(espId);
        // espConnections.delete(espId);
        return ws.terminate();
      }

      customWs.isAlive = false;
      ws.ping();
    }
  }, 15000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  function heartbeat(this: CustomWebsocket) {
    this.isAlive = true;
  }

  return wss;
}

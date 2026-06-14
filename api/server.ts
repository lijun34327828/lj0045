import http from 'http';
import { WebSocketServer } from 'ws';
import app from './app.js';
import { handleWebSocket } from './websocket/audioHandler.js';

const PORT = process.env.PORT || 8765;

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/ws/audio' });

wss.on('connection', handleWebSocket);

server.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
  console.log(`WebSocket server ready on ws://localhost:${PORT}/ws/audio`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});

export default app;

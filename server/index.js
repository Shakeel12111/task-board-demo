import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createApp } from './app.js';
import { createStore } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'client', 'dist');

const store = createStore();
store.add('Open this page in a second tab');
store.add('Mark a task as done and watch both tabs update');

const server = http.createServer();
const wss = new WebSocketServer({ server, path: '/ws' });

function snapshot() {
  return JSON.stringify({ type: 'tasks', tasks: store.list() });
}

function broadcast() {
  const message = snapshot();
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  }
}

wss.on('connection', (socket) => {
  socket.send(snapshot());
});

const app = createApp({ store, onChange: broadcast });
app.use(express.static(distDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

server.on('request', app);

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  console.log(`Task board running on http://localhost:${port}`);
});

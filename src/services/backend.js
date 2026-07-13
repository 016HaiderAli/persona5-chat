// src/services/backend.js
import PocketBase from 'pocketbase';
import { io } from 'socket.io-client';

const pocketbaseUrl = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const socketServerUrl = import.meta.env.VITE_SOCKET_SERVER_URL || 'http://localhost:3001';

// 1. Initialize PocketBase
export const pb = new PocketBase(pocketbaseUrl);

// 2. Initialize Socket.io
export const socket = io(socketServerUrl, {
  autoConnect: true,
});

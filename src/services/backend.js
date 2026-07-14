import PocketBase from 'pocketbase';
import { io } from 'socket.io-client';

// Gateway URL structure for client-side proxy routing:
// 1. /pb_api/* -> http://127.0.0.1:8090/api/*
// 2. /socket.io/* -> http://127.0.0.1:3001/socket.io/*

export const pb = new PocketBase('/pb_api');

export const socket = io(
  typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:3001',
  {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling']
  }
);

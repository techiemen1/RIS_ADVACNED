// src/services/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function initSocket(token?: string) {
  if (socket) return socket;
  socket = io(import.meta.env.VITE_API_BASE || '/', {
    path: import.meta.env.VITE_SOCKET_PATH || '/socket.io',
    autoConnect: true,
    auth: token ? { token } : undefined,
  });
  return socket;
}

export function getSocket() { return socket; }
export function disconnectSocket() { socket?.disconnect(); socket = null; }

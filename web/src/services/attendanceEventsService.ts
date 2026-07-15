import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectAttendanceEvents = (token: string): Socket => {
  if (socket?.connected) {
    return socket;
  }

  // FIX: Usar URL relativa como fallback (igual ao chatService) em vez de localhost hardcoded.
  // Em produção sem VITE_WS_URL, 'http://localhost:3000' conectaria no servidor do cliente.
  const wsUrl = import.meta.env.VITE_WS_URL || '';
  
  socket = io(`${wsUrl}/sala-lilas-events`, {
    auth: {
      token: token,
    },
    // FIX: Forçar apenas WebSocket — polling expõe token na URL
    transports: ['websocket'],
    upgrade: false,
  });

  return socket;
};

export const disconnectAttendanceEvents = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getAttendanceEventsSocket = (): Socket | null => {
  return socket;
};

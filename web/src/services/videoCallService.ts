import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectVideoCall = (attendanceId: string, token: string): Socket => {
  if (socket?.connected) {
    socket.disconnect();
  }

  const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
  
  socket = io(`${wsUrl}/sala-lilas-video`, {
    auth: {
      token: token,
    },
    query: {
      attendanceId: attendanceId,
    },
    transports: ['websocket', 'polling'],
  });

  return socket;
};

export const disconnectVideoCall = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getVideoCallSocket = (): Socket | null => {
  return socket;
};

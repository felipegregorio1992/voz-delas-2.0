import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectChat = (attendanceId: string, token: string): Socket => {
  if (socket?.connected) {
    socket.disconnect();
  }

  const wsUrl = import.meta.env.VITE_WS_URL || '';

  socket = io(`${wsUrl}/sala-lilas-chat`, {
    auth: {
      // FIX #2: Token enviado apenas no handshake auth (não na query string).
      // Query string aparece em logs de servidor, proxies e histórico do browser.
      token,
    },
    query: {
      attendanceId,
    },
    // FIX #2: Forçar apenas WebSocket — sem fallback para polling.
    // No modo polling, o token seria exposto na URL de cada requisição HTTP.
    transports: ['websocket'],
    upgrade: false,
    // Reconexão automática com backoff exponencial
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socket;
};

export const disconnectChat = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => {
  return socket;
};

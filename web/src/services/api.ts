import axios from 'axios';
import toast from 'react-hot-toast';

export const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
  withCredentials: true, // envia cookies HttpOnly automaticamente
});

// Interceptor de request — sem manipulação de token
api.interceptors.request.use((config) => config);

// Flag para evitar múltiplos refreshes simultâneos
let isRefreshing = false;
let refreshSubscribers: Array<(success: boolean) => void> = [];

function onRefreshComplete(success: boolean) {
  refreshSubscribers.forEach((cb) => cb(success));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Erro de rede — backend não está rodando
    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      !error.response
    ) {
      toast.error('Backend não está acessível. Verifique se o servidor está rodando.', {
        duration: 5000,
        id: 'backend-offline', // evita toasts duplicados
      });
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    const status = error.response?.status;

    // Só tentar refresh em 401, e apenas UMA vez por request
    if (status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Rotas de auth nunca devem tentar refresh (evita loop infinito)
    const url: string = originalRequest.url || '';
    const isAuthRoute =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout');

    if (isAuthRoute) {
      return Promise.reject(error);
    }

    // /me falhou com 401 = usuário simplesmente não está logado.
    // NÃO tentar refresh — apenas rejeitar silenciosamente.
    // O AuthContext trata isso setando user = null.
    if (url.includes('/me')) {
      return Promise.reject(error);
    }

    // Para outros endpoints protegidos: tentar refresh uma vez
    originalRequest._retry = true;

    if (isRefreshing) {
      // Já há um refresh em andamento — aguardar o resultado
      return new Promise((resolve, reject) => {
        refreshSubscribers.push((success) => {
          if (success) resolve(api(originalRequest));
          else reject(error);
        });
      });
    }

    isRefreshing = true;

    try {
      // O cookie refreshToken é enviado automaticamente
      await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
      isRefreshing = false;
      onRefreshComplete(true);
      return api(originalRequest);
    } catch {
      isRefreshing = false;
      onRefreshComplete(false);
      // Refresh falhou — redirecionar para login apenas se não estiver já lá
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  },
);

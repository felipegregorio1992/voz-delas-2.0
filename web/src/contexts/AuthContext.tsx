import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Começa como true para mostrar "Carregando..." enquanto verifica sessão
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sessão existente ao montar (cookie pode já estar presente)
    checkSession();
  }, []);

  // Tenta carregar o usuário via cookie existente.
  // Se não houver sessão, apenas seta user = null — sem redirect, sem loop.
  const checkSession = async () => {
    try {
      const response = await api.get('/me');
      const userData = response.data?.data || response.data;
      setUser(userData ?? null);
    } catch {
      // 401 = não há sessão ativa. Normal ao abrir o app pela primeira vez.
      setUser(null);
    } finally {
      // SEMPRE liberar o loading — sem isso o app fica travado na tela de carregamento
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    // POST /auth/login retorna tokens no body E seta cookies HttpOnly
    const response = await api.post('/auth/login', { email, password });

    // Estrutura da resposta: { data: { user, accessToken, refreshToken } }
    const responseData = response.data?.data || response.data;

    if (!responseData?.user) {
      throw new Error('Resposta de login inválida');
    }

    // Após o login, o cookie já foi setado pelo backend.
    // Buscar /me para obter o perfil completo com roles.
    try {
      const meResponse = await api.get('/me');
      const meData = meResponse.data?.data || meResponse.data;
      setUser(meData ?? responseData.user);
    } catch {
      // Se /me falhar por algum motivo, usar os dados básicos do login
      setUser(responseData.user);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // Ignorar erros — limpar estado local de qualquer forma
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

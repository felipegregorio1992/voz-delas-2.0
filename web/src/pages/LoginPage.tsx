import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './LoginPage.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Login realizado com sucesso!');
      navigate('/'); // HomeRedirect decide para onde ir baseado no role
    } catch (error: any) {
      const status = error.response?.status;
      const msg = error.response?.data?.data?.error
        || error.response?.data?.error
        || error.response?.data?.message
        || error.message;

      if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || error.message?.includes('ECONNREFUSED')) {
        toast.error('Backend não está rodando. Execute: npm run start:dev', { duration: 8000 });
      } else if (status === 401) {
        toast.error('Email ou senha incorretos.');
      } else if (status === 429) {
        toast.error('Muitas tentativas. Aguarde um minuto.');
      } else {
        toast.error(msg || 'Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Voz Delas</h1>
          <p>Dashboard de Monitoramento</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@vozdelas.com"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading} className="login-button">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <div className="login-info">
          <p>Acesse com suas credenciais de administrador.</p>
        </div>
      </div>
    </div>
  );
}


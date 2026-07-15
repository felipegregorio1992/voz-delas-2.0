import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './AppHeader.css';

export default function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  const permissions = user?.permissions || [];
  const isAdmin = permissions.includes('ADMIN_PANEL');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) {
        setAdminMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="app-header">
      <div className="app-header-content">
        <img src="/images/logo_preto.png" alt="Voz Delas" className="app-header-logo" />
        <div className="app-header-actions">
          {permissions.includes('DASHBOARD_VIEW') && (
            <button
              onClick={() => navigate('/dashboard')}
              className="app-header-btn app-header-btn--dashboard"
              title="Dashboard"
            >
              📊 Dashboard
            </button>
          )}
          {permissions.includes('SALA_LILAS_ACCESS') && (
            <button
              onClick={() => navigate('/sala-lilas')}
              className="app-header-btn app-header-btn--sala-lilas"
              title="Acessar Sala Lilás Virtual"
            >
              💜 Sala Lilás Virtual
            </button>
          )}
          {(permissions.includes('SALA_LILAS_ACCESS') || permissions.includes('OPERATING_HOURS_MANAGE')) && (
            <button
              onClick={() => navigate('/calendario')}
              className="app-header-btn app-header-btn--calendar"
              title="Calendário de Funcionamento"
            >
              📅 Calendário
            </button>
          )}
          {permissions.includes('ANNOUNCEMENTS_MANAGE') && (
            <button
              onClick={() => navigate('/announcements')}
              className="app-header-btn app-header-btn--announcements"
              title="Gerenciar Eventos e Avisos"
            >
              📢 Avisos
            </button>
          )}
          {permissions.includes('ANNOUNCEMENTS_MANAGE') && (
            <button
              onClick={() => navigate('/events')}
              className="app-header-btn app-header-btn--events"
              title="Gerenciar Eventos e Atividades"
            >
              🗓️ Eventos
            </button>
          )}
          {(permissions.includes('TOTEMS_MANAGE') || isAdmin) && (
            <button
              onClick={() => navigate('/totems')}
              className="app-header-btn app-header-btn--totems"
              title="Gerenciar Totens de Apoio"
            >
              📍 Totems
            </button>
          )}

          {isAdmin ? (
            <div className="app-header-admin-wrapper" ref={adminMenuRef}>
              <button
                className="app-header-admin-btn"
                onClick={() => setAdminMenuOpen((v) => !v)}
              >
                {user?.name}
                <span className="app-header-chevron">{adminMenuOpen ? '▲' : '▼'}</span>
              </button>
              {adminMenuOpen && (
                <div className="app-header-dropdown">
                  <button
                    className="app-header-dropdown-item"
                    onClick={() => { setAdminMenuOpen(false); navigate('/admin/usuarios'); }}
                  >
                    👥 Gerenciar Usuários
                  </button>
                  <button
                    className="app-header-dropdown-item"
                    onClick={() => { setAdminMenuOpen(false); navigate('/admin/usuarios?action=create'); }}
                  >
                    ➕ Criar Conta
                  </button>
                  <div className="app-header-dropdown-divider" />
                  <button
                    className="app-header-dropdown-item app-header-dropdown-item--danger"
                    onClick={() => { setAdminMenuOpen(false); logout(); }}
                  >
                    🚪 Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <span className="app-header-user-name">{user?.name}</span>
              <button onClick={logout} className="app-header-logout-btn">
                Sair
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

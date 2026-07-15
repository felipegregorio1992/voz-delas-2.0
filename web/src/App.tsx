import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SalaLilasPage from './pages/SalaLilasPage';
import AttendanceDetailPage from './pages/AttendanceDetailPage';
import CalendarPage from './pages/CalendarPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import EventsPage from './pages/EventsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import TotemsPage from './pages/TotemsPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

function PermissionRoute({
  children,
  allowedPermissions,
  redirectTo,
}: {
  children: React.ReactNode;
  allowedPermissions: string[];
  redirectTo?: string;
}) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const roles = user?.roles || [];
  const permissions = user?.permissions || [];
  const hasPermission = permissions.some((p) => allowedPermissions.includes(p));

  if (!hasPermission) {
    // Psicólogo sem permissão → redireciona para Sala Lilás (não para dashboard)
    const fallback = redirectTo || (roles.includes('PSYCHOLOGIST') ? '/sala-lilas' : '/dashboard');
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}

// ── Redirect inteligente baseado em role ─────────────────────────────────
function HomeRedirect() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const roles = user?.roles || [];
  const permissions = user?.permissions || [];

  // Psicólogo vai direto para Sala Lilás
  if (roles.includes('PSYCHOLOGIST')) return <Navigate to="/sala-lilas" replace />;

  const canSeeDashboard =
    permissions.includes('DASHBOARD_VIEW') ||
    permissions.includes('PANIC_VIEW') ||
    permissions.includes('INCIDENTS_VIEW') ||
    permissions.includes('MERCHANTS_VIEW') ||
    permissions.includes('MERCHANT_REQUESTS_MANAGE') ||
    permissions.includes('SUPPORT_SERVICES_MANAGE') ||
    permissions.includes('ANNOUNCEMENTS_MANAGE') ||
    permissions.includes('EVENTS_MANAGE') ||
    permissions.includes('ADMIN_PANEL');

  const canSeeSalaLilas = permissions.includes('SALA_LILAS_ACCESS');

  if (canSeeSalaLilas && !canSeeDashboard) return <Navigate to="/sala-lilas" replace />;
  return <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Público */}
          <Route path="/login" element={<LoginPage />} />

          {/* Redirect inteligente */}
          <Route path="/" element={<HomeRedirect />} />

          {/* Dashboard — ADMIN, OPERATOR, SECURITY, GUARD */}
          <Route
            path="/dashboard"
            element={
              <PermissionRoute allowedPermissions={['DASHBOARD_VIEW']}>
                <DashboardPage />
              </PermissionRoute>
            }
          />

          {/* Sala Lilás */}
          <Route
            path="/sala-lilas"
            element={
              <PermissionRoute allowedPermissions={['SALA_LILAS_ACCESS']}>
                <SalaLilasPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/sala-lilas/attendance/:id"
            element={
              <PermissionRoute allowedPermissions={['SALA_LILAS_ACCESS']}>
                <AttendanceDetailPage />
              </PermissionRoute>
            }
          />

          {/* Calendário */}
          <Route
            path="/calendario"
            element={
              <PermissionRoute allowedPermissions={['SALA_LILAS_ACCESS', 'OPERATING_HOURS_MANAGE']}>
                <CalendarPage />
              </PermissionRoute>
            }
          />

          {/* Gerenciamento de Anúncios/Eventos */}
          <Route
            path="/announcements"
            element={
              <PermissionRoute allowedPermissions={['ANNOUNCEMENTS_MANAGE']}>
                <AnnouncementsPage />
              </PermissionRoute>
            }
          />

          {/* Gerenciamento de Eventos/Inscrições */}
          <Route
            path="/events"
            element={
              <PermissionRoute allowedPermissions={['ANNOUNCEMENTS_MANAGE']}>
                <EventsPage />
              </PermissionRoute>
            }
          />

          {/* Gestão de usuários/cargos — ADMIN_PANEL */}
          <Route
            path="/admin/usuarios"
            element={
              <PermissionRoute allowedPermissions={['ADMIN_PANEL']}>
                <AdminUsersPage />
              </PermissionRoute>
            }
          />

          {/* Totens de Apoio */}
          <Route
            path="/totems"
            element={
              <PermissionRoute allowedPermissions={['TOTEMS_MANAGE', 'ADMIN_PANEL']}>
                <TotemsPage />
              </PermissionRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

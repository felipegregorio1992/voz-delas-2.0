import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import AnnouncementsList from '../components/AnnouncementsList';
import AnnouncementForm from '../components/AnnouncementForm';
import AppLayout from '../components/AppLayout';
import './AnnouncementsPage.css';

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'BANNER' | 'NOTICE'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const permissions = user?.permissions || [];

  const loadAnnouncements = async () => {
    try {
      const res = await api.get('/announcements/admin/all');
      const data = res.data?.data || res.data || [];
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Erro ao carregar anúncios:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const filteredAnnouncements = announcements.filter((a) => {
    if (filterType !== 'ALL' && a.type !== filterType) return false;
    if (filterStatus === 'ACTIVE' && !a.isActive) return false;
    if (filterStatus === 'INACTIVE' && a.isActive) return false;
    return true;
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="announcements-page-loading">
          <div>Carregando anúncios...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="announcements-page">
        <div className="announcements-page-header">
          <div className="announcements-page-title">
            <h1>📢 Gerenciar Eventos e Avisos</h1>
            <p>Cadastre banners e avisos que aparecerão no aplicativo mobile</p>
          </div>
          {permissions.includes('ANNOUNCEMENTS_MANAGE') && (
            <button
              className="btn-new-announcement"
              onClick={() => {
                setEditingAnnouncement(null);
                setShowForm(true);
              }}
            >
              + Novo Evento/Aviso
            </button>
          )}
        </div>

        <div className="announcements-page-filters">
          <div className="filter-group">
            <label>Tipo:</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
              <option value="ALL">Todos</option>
              <option value="BANNER">Banners</option>
              <option value="NOTICE">Avisos</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Ativos</option>
              <option value="INACTIVE">Inativos</option>
            </select>
          </div>
          <div className="filter-stats">
            <span className="stat-badge stat-badge--total">{announcements.length} total</span>
            <span className="stat-badge stat-badge--active">{announcements.filter(a => a.isActive).length} ativos</span>
            <span className="stat-badge stat-badge--banners">{announcements.filter(a => a.type === 'BANNER').length} banners</span>
            <span className="stat-badge stat-badge--notices">{announcements.filter(a => a.type === 'NOTICE').length} avisos</span>
          </div>
        </div>

        <AnnouncementsList
          announcements={filteredAnnouncements}
          onUpdate={loadAnnouncements}
          onEdit={(announcement) => {
            setEditingAnnouncement(announcement);
            setShowForm(true);
          }}
        />

        {showForm && (
          <AnnouncementForm
            announcement={editingAnnouncement}
            onClose={() => {
              setShowForm(false);
              setEditingAnnouncement(null);
            }}
            onSuccess={() => {
              loadAnnouncements();
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}

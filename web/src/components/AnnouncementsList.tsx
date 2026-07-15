import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import './AnnouncementsList.css';

interface Announcement {
  id: string;
  title: string;
  content?: string;
  imageUrl?: string;
  type: 'BANNER' | 'NOTICE';
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

interface AnnouncementsListProps {
  announcements: Announcement[];
  onUpdate: () => void;
  onEdit: (announcement: Announcement) => void;
}

const getTypeLabel = (type: string) => {
  return type === 'BANNER' ? 'Banner' : 'Aviso';
};

const getTypeColor = (type: string) => {
  return type === 'BANNER' ? '#2196f3' : '#ff9800';
};

export default function AnnouncementsList({ announcements, onUpdate, onEdit }: AnnouncementsListProps) {
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/announcements/admin/${id}`, {
        isActive: !currentStatus,
      });
      toast.success(`Anúncio ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
      onUpdate();
    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      const errorMessage = error.response?.data?.error ||
                          error.response?.data?.message ||
                          error.message ||
                          'Erro ao alterar status do anúncio';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Tem certeza que deseja excluir o anúncio "${title}"?`)) {
      return;
    }

    try {
      await api.delete(`/announcements/admin/${id}`);
      toast.success('Anúncio excluído com sucesso!');
      onUpdate();
    } catch (error: any) {
      console.error('Erro ao excluir anúncio:', error);
      const errorMessage = error.response?.data?.error ||
                          error.response?.data?.message ||
                          error.message ||
                          'Erro ao excluir anúncio';
      toast.error(errorMessage);
    }
  };

  if (announcements.length === 0) {
    return (
      <div className="announcements-list empty">
        <p>Nenhum anúncio cadastrado</p>
      </div>
    );
  }

  return (
    <div className="announcements-list">
      <div className="list-header">
        <h3>Banners e Avisos ({announcements.length})</h3>
      </div>
      <div className="list-content">
        {announcements.map((announcement) => (
          <div key={announcement.id} className={`announcement-item ${!announcement.isActive ? 'inactive' : ''}`}>
            <div className="announcement-header">
              <div>
                <div className="announcement-type-badge" style={{ backgroundColor: getTypeColor(announcement.type) }}>
                  {getTypeLabel(announcement.type)}
                </div>
                <h4>{announcement.title}</h4>
                {!announcement.isActive && (
                  <span className="inactive-badge">Inativo</span>
                )}
              </div>
            </div>
            <div className="announcement-body">
              <div className="announcement-info">
                {announcement.content && (
                  <div className="info-row">
                    <strong>Conteúdo:</strong> {announcement.content.length > 100 ? announcement.content.substring(0, 100) + '...' : announcement.content}
                  </div>
                )}
                {announcement.imageUrl && (
                  <div className="info-row">
                    <strong>Imagem:</strong> <a href={announcement.imageUrl} target="_blank" rel="noopener noreferrer">Ver imagem</a>
                  </div>
                )}
                {announcement.startDate && (
                  <div className="info-row">
                    <strong>Início:</strong>{' '}
                    {format(new Date(announcement.startDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                )}
                {announcement.endDate && (
                  <div className="info-row">
                    <strong>Fim:</strong>{' '}
                    {format(new Date(announcement.endDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                )}
                <div className="info-row">
                  <strong>Cadastrado em:</strong>{' '}
                  {format(new Date(announcement.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              </div>
              <div className="announcement-actions">
                <button
                  className="btn-edit"
                  onClick={() => onEdit(announcement)}
                >
                  ✏️ Editar
                </button>
                <button
                  className={`btn-toggle ${announcement.isActive ? 'btn-hide' : 'btn-show'}`}
                  onClick={() => handleToggleActive(announcement.id, announcement.isActive)}
                >
                  {announcement.isActive ? '🚫 Desativar' : '✅ Ativar'}
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(announcement.id, announcement.title)}
                >
                  🗑️ Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

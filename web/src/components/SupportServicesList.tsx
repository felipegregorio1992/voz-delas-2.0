import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import './SupportServicesList.css';

interface SupportService {
  id: string;
  name: string;
  type: 'CEAM' | 'DEAM' | 'DEFENSORIA' | 'OUTRO';
  phone?: string;
  address?: string;
  hours?: string;
  city?: string;
  isActive: boolean;
  createdAt: string;
}

interface SupportServicesListProps {
  services: SupportService[];
  onUpdate: () => void;
  onEdit: (service: SupportService) => void;
}

const getTypeLabel = (type: string) => {
  const types: Record<string, string> = {
    CEAM: 'CEAM',
    DEAM: 'DEAM',
    DEFENSORIA: 'Defensoria',
    OUTRO: 'Outro',
  };
  return types[type] || type;
};

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    CEAM: '#2196f3',
    DEAM: '#f44336',
    DEFENSORIA: '#4caf50',
    OUTRO: '#9e9e9e',
  };
  return colors[type] || '#666';
};

export default function SupportServicesList({ services, onUpdate, onEdit }: SupportServicesListProps) {
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/support-services/admin/${id}`, {
        isActive: !currentStatus,
      });
      toast.success(`Serviço ${!currentStatus ? 'ativado' : 'ocultado'} com sucesso!`);
      onUpdate();
    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Erro ao alterar status do serviço';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o serviço "${name}"?`)) {
      return;
    }

    try {
      await api.delete(`/support-services/admin/${id}`);
      toast.success('Serviço excluído com sucesso!');
      onUpdate();
    } catch (error: any) {
      console.error('Erro ao excluir serviço:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Erro ao excluir serviço';
      toast.error(errorMessage);
    }
  };

  if (services.length === 0) {
    return (
      <div className="support-services-list empty">
        <p>Nenhum serviço cadastrado</p>
      </div>
    );
  }

  return (
    <div className="support-services-list">
      <div className="list-header">
        <h3>Serviços de Apoio ({services.length})</h3>
      </div>
      <div className="list-content">
        {services.map((service) => (
          <div key={service.id} className={`service-item ${!service.isActive ? 'inactive' : ''}`}>
            <div className="service-header">
              <div>
                <div className="service-type-badge" style={{ backgroundColor: getTypeColor(service.type) }}>
                  {getTypeLabel(service.type)}
                </div>
                <h4>{service.name}</h4>
                {!service.isActive && (
                  <span className="inactive-badge">Oculto</span>
                )}
              </div>
            </div>
            <div className="service-body">
              <div className="service-info">
                {service.phone && (
                  <div className="info-row">
                    <strong>Telefone:</strong> {service.phone}
                  </div>
                )}
                {service.address && (
                  <div className="info-row">
                    <strong>Endereço:</strong> {service.address}
                  </div>
                )}
                {service.city && (
                  <div className="info-row">
                    <strong>Cidade:</strong> {service.city}
                  </div>
                )}
                {service.hours && (
                  <div className="info-row">
                    <strong>Horário:</strong> {service.hours}
                  </div>
                )}
                <div className="info-row">
                  <strong>Cadastrado em:</strong>{' '}
                  {format(new Date(service.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </div>
              </div>
              <div className="service-actions">
                <button
                  className="btn-edit"
                  onClick={() => onEdit(service)}
                >
                  ✏️ Editar
                </button>
                <button
                  className={`btn-toggle ${service.isActive ? 'btn-hide' : 'btn-show'}`}
                  onClick={() => handleToggleActive(service.id, service.isActive)}
                >
                  {service.isActive ? '👁️ Ocultar' : '👁️‍🗨️ Mostrar'}
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(service.id, service.name)}
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

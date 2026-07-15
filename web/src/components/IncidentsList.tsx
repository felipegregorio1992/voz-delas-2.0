import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './IncidentsList.css';
import { useReverseGeocode } from '../hooks/useReverseGeocode';

interface Incident {
  id: string;
  type: string;
  description: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  locations: Array<{
    id: string;
    lat: number;
    lng: number;
    accuracy?: number;
    createdAt: string;
  }>;
}

interface IncidentsListProps {
  incidents: Incident[];
  selectedIncidentId?: string | null;
  onIncidentClick?: (id: string) => void;
}

const getTypeLabel = (type: string) => {
  const types: Record<string, string> = {
    VIOLENCE: 'Violência',
    HARASSMENT: 'Assédio',
    THREAT: 'Ameaça',
    OTHER: 'Outro',
  };
  return types[type] || type;
};

const getStatusLabel = (status: string) => {
  const statuses: Record<string, string> = {
    PENDING: 'Pendente',
    IN_PROGRESS: 'Em Andamento',
    RESOLVED: 'Resolvida',
    CANCELLED: 'Cancelada',
  };
  return statuses[status] || status;
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    PENDING: '#ff9800',
    IN_PROGRESS: '#2196f3',
    RESOLVED: '#4caf50',
    CANCELLED: '#9e9e9e',
  };
  return colors[status] || '#666';
};

function IncidentAddress({ locations }: { locations: Incident['locations'] }) {
  const first = locations[0];
  const { address, loading } = useReverseGeocode(first?.lat, first?.lng);
  if (!first) return null;
  return (
    <div className="info-row">
      <strong>Endereço:</strong>{' '}
      <span style={{ color: loading ? '#999' : '#333' }}>
        {loading ? 'Buscando...' : address}
      </span>
    </div>
  );
}

export default function IncidentsList({ 
  incidents, 
  selectedIncidentId,
  onIncidentClick 
}: IncidentsListProps) {
  if (incidents.length === 0) {
    return (
      <div className="incidents-list empty">
        <p>Nenhuma denúncia encontrada</p>
      </div>
    );
  }

  return (
    <div className="incidents-list">
      <div className="list-header">
        <h3>Denúncias ({incidents.length})</h3>
        {selectedIncidentId && (
          <button 
            className="clear-selection-btn"
            onClick={() => onIncidentClick?.(selectedIncidentId)}
            title="Limpar seleção"
          >
            ✕
          </button>
        )}
      </div>
      <div className="list-content">
        {incidents.map((incident) => (
          <div 
            key={incident.id} 
            className={`incident-item ${selectedIncidentId === incident.id ? 'selected' : ''}`}
            onClick={() => onIncidentClick?.(incident.id)}
            style={{ cursor: 'pointer' }}
          >
            <div className="incident-header">
              <span className="incident-type">{getTypeLabel(incident.type)}</span>
              <span
                className="incident-status"
                style={{ backgroundColor: getStatusColor(incident.status) }}
              >
                {getStatusLabel(incident.status)}
              </span>
            </div>
            <div className="incident-body">
              <p className="incident-description">
                {incident.description || 'Sem descrição'}
              </p>
              <div className="incident-info">
                <div className="info-row">
                  <strong>Usuária:</strong> {incident.user.name}
                </div>
                <div className="info-row">
                  <strong>Telefone:</strong> {incident.user.phone || 'N/A'}
                </div>
                <div className="info-row">
                  <strong>Localizações:</strong> {incident.locations.length}
                </div>
                <IncidentAddress locations={incident.locations} />
                <div className="info-row">
                  <strong>Data:</strong>{' '}
                  {format(new Date(incident.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


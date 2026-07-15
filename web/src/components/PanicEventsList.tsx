import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './PanicEventsList.css';

interface PanicEvent {
  id: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
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

interface PanicEventsListProps {
  events: PanicEvent[];
  activeEvents: PanicEvent[];
}



const getDuration = (startedAt: string, endedAt: string | null) => {
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date();
  const diff = Math.floor((end.getTime() - start.getTime()) / 1000);
  
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}min`;
};

export default function PanicEventsList({ events, activeEvents }: PanicEventsListProps) {
  const activeIds = new Set(activeEvents.map((e) => e.id));

  if (events.length === 0) {
    return (
      <div className="panic-events-list empty">
        <p>Nenhum evento de pânico encontrado</p>
      </div>
    );
  }

  return (
    <div className="panic-events-list">
      <div className="list-header">
        <h3>Eventos de Pânico ({events.length})</h3>
        {activeEvents.length > 0 && (
          <span className="active-badge">{activeEvents.length} Ativo(s)</span>
        )}
      </div>
      <div className="list-content">
        {events.map((event) => {
          const isActive = activeIds.has(event.id);
          return (
            <div
              key={event.id}
              className={`panic-event-item ${isActive ? 'active' : ''}`}
            >
              <div className="panic-event-header">
                <div className="panic-event-status">
                  <span className={`status-indicator ${isActive ? 'active' : ''}`}></span>
                  <span className="status-label">
                    {isActive ? '🚨 ATIVO' : '✓ Encerrado'}
                  </span>
                </div>
                <span className="panic-duration">
                  {getDuration(event.startedAt, event.endedAt)}
                </span>
              </div>
              <div className="panic-event-body">
                <div className="info-row">
                  <strong>Usuária:</strong> {event.user.name}
                </div>
                <div className="info-row">
                  <strong>Telefone:</strong> {event.user.phone || 'N/A'}
                </div>
                <div className="info-row">
                  <strong>Localizações:</strong> {event.locations.length}
                </div>
                <div className="info-row">
                  <strong>Iniciado:</strong>{' '}
                  {format(new Date(event.startedAt), "dd/MM/yyyy 'às' HH:mm:ss", {
                    locale: ptBR,
                  })}
                </div>
                {event.endedAt && (
                  <div className="info-row">
                    <strong>Encerrado:</strong>{' '}
                    {format(new Date(event.endedAt), "dd/MM/yyyy 'às' HH:mm:ss", {
                      locale: ptBR,
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


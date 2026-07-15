import { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import AppLayout from '../components/AppLayout';
import './EventsPage.css';

const CATEGORY_LABELS: Record<string, string> = {
  COURSE: 'Curso',
  WORKSHOP: 'Oficina',
  PHYSICAL_ACTIVITY: 'Atividade Física',
  CULTURAL: 'Cultural',
  HEALTH: 'Saúde',
  ENTREPRENEURSHIP: 'Empreendedorismo',
  OTHER: 'Outro',
};

const SECTOR_LABELS: Record<string, string> = {
  SEDE: 'Sede da Secretaria',
  CASA_DA_MULHER: 'Casa da Mulher Heloneida Studart',
};

const PROGRAM_LABELS: Record<string, string> = {
  ELA_EM_MOVIMENTO: 'Ela em Movimento',
  ELA_NA_CULTURA: 'Ela na Cultura',
  EMPREENDA_MULHER: 'Empreenda Mulher',
  CAIMO: 'CAIMO',
  PROJETO_MUSAS: 'Projeto Musas',
  SALAO_TIA_ROSA: 'Salão Tia Rosa',
  CEAM: 'CEAM',
  REDE_DE_CUIDADO: 'Rede de Cuidado',
};

interface Event {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  location?: string;
  imageUrl?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  maxSlots?: number;
  sector?: string;
  program?: string;
  createdAt: string;
  _count?: { registrations: number };
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [registrationsModal, setRegistrationsModal] = useState<{ eventId: string; eventTitle: string } | null>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

  const loadEvents = async () => {
    try {
      const res = await api.get('/events/admin/all');
      const data = res.data?.data || res.data || [];
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEvents(); }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Excluir evento "${title}"?`)) return;
    try {
      await api.delete(`/events/admin/${id}`);
      toast.success('Evento excluído');
      loadEvents();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao excluir');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PUBLISHED' ? 'CANCELLED' : 'PUBLISHED';
    try {
      await api.patch(`/events/admin/${id}`, { status: newStatus });
      toast.success(newStatus === 'PUBLISHED' ? 'Evento publicado' : 'Evento cancelado');
      loadEvents();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro');
    }
  };

  const handleViewRegistrations = async (eventId: string, eventTitle: string) => {
    setRegistrationsModal({ eventId, eventTitle });
    setLoadingRegistrations(true);
    try {
      const res = await api.get(`/events/admin/${eventId}/registrations`);
      const data = res.data?.data || res.data || [];
      setRegistrations(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error('Erro ao carregar inscritos');
      setRegistrations([]);
    } finally {
      setLoadingRegistrations(false);
    }
  };

  if (loading) {
    return <AppLayout><div className="events-page-loading">Carregando eventos...</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="events-page">
        <div className="events-page-header">
          <div>
            <h1>📅 Gerenciar Eventos</h1>
            <p>Crie cursos, oficinas, atividades físicas e eventos que aparecerão no app</p>
          </div>
          <button className="btn-new-event" onClick={() => { setEditing(null); setShowForm(true); }}>
            + Novo Evento
          </button>
        </div>

        <div className="events-stats">
          <span className="stat-badge">{events.length} total</span>
          <span className="stat-badge stat-badge--published">{events.filter(e => e.status === 'PUBLISHED').length} publicados</span>
          <span className="stat-badge stat-badge--cancelled">{events.filter(e => e.status === 'CANCELLED').length} cancelados</span>
        </div>

        {events.length === 0 ? (
          <div className="events-empty">Nenhum evento cadastrado</div>
        ) : (
          <div className="events-grid">
            {events.map((event) => (
              <div key={event.id} className={`event-card ${event.status !== 'PUBLISHED' ? 'event-card--inactive' : ''}`}>
                {event.imageUrl && (
                  <img src={event.imageUrl} alt={event.title} className="event-card-image" />
                )}
                <div className="event-card-body">
                  <div className="event-card-badges">
                    <span className="badge-category">{CATEGORY_LABELS[event.category] || event.category}</span>
                    {event.sector && <span className="badge-sector">{SECTOR_LABELS[event.sector] || event.sector}</span>}
                    {event.status !== 'PUBLISHED' && <span className="badge-status">{event.status}</span>}
                  </div>
                  <h3>{event.title}</h3>
                  {event.description && <p className="event-desc">{event.description.slice(0, 100)}{event.description.length > 100 ? '...' : ''}</p>}
                  <div className="event-meta">
                    <span>📅 {new Date(event.startDate).toLocaleDateString('pt-BR')}</span>
                    {event.startTime && <span>🕐 {event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}</span>}
                    {event.location && <span>📍 {event.location}</span>}
                    <span>👥 {event._count?.registrations || 0} inscritos{event.maxSlots ? ` / ${event.maxSlots} vagas` : ''}</span>
                  </div>
                  <div className="event-card-actions">
                    <button onClick={() => handleViewRegistrations(event.id, event.title)}>👥 Inscritos</button>
                    <button onClick={() => { setEditing(event); setShowForm(true); }}>✏️ Editar</button>
                    <button onClick={() => handleToggleStatus(event.id, event.status)}>
                      {event.status === 'PUBLISHED' ? '🚫 Cancelar' : '✅ Publicar'}
                    </button>
                    <button className="btn-danger" onClick={() => handleDelete(event.id, event.title)}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <EventForm
            event={editing}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSuccess={loadEvents}
          />
        )}

        {registrationsModal && (
          <div className="event-form-overlay" onClick={() => setRegistrationsModal(null)}>
            <div className="event-form-modal registrations-modal" onClick={(e) => e.stopPropagation()}>
              <div className="form-header">
                <h2>👥 Inscritos — {registrationsModal.eventTitle}</h2>
                <button className="close-button" onClick={() => setRegistrationsModal(null)}>✕</button>
              </div>
              <div className="registrations-content">
                {loadingRegistrations ? (
                  <p className="registrations-loading">Carregando inscritos...</p>
                ) : registrations.length === 0 ? (
                  <p className="registrations-empty">Nenhuma pessoa inscrita neste evento.</p>
                ) : (
                  <>
                    <p className="registrations-count">{registrations.length} pessoa(s) inscrita(s)</p>
                    <table className="registrations-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Nome</th>
                          <th>E-mail</th>
                          <th>Telefone</th>
                          <th>Data da Inscrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registrations.map((reg, idx) => (
                          <tr key={reg.id}>
                            <td>{idx + 1}</td>
                            <td>{reg.user?.name || '—'}</td>
                            <td>{reg.user?.email || '—'}</td>
                            <td>{reg.user?.phone || '—'}</td>
                            <td>{new Date(reg.createdAt).toLocaleDateString('pt-BR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// ── Formulário de Evento ─────────────────────────────────────────────────────

function EventForm({ event, onClose, onSuccess }: { event: Event | null; onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [category, setCategory] = useState(event?.category || 'COURSE');
  const [location, setLocation] = useState(event?.location || '');
  const [startDate, setStartDate] = useState(event?.startDate ? event.startDate.slice(0, 10) : '');
  const [endDate, setEndDate] = useState(event?.endDate ? event.endDate.slice(0, 10) : '');
  const [startTime, setStartTime] = useState(event?.startTime || '');
  const [endTime, setEndTime] = useState(event?.endTime || '');
  const [maxSlots, setMaxSlots] = useState(event?.maxSlots?.toString() || '');
  const [sector, setSector] = useState(event?.sector || '');
  const [program, setProgram] = useState(event?.program || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('category', category);
      formData.append('startDate', new Date(startDate).toISOString());
      if (description.trim()) formData.append('description', description.trim());
      if (location.trim()) formData.append('location', location.trim());
      if (endDate) formData.append('endDate', new Date(endDate).toISOString());
      if (startTime) formData.append('startTime', startTime);
      if (endTime) formData.append('endTime', endTime);
      if (maxSlots) formData.append('maxSlots', maxSlots);
      if (sector) formData.append('sector', sector);
      if (program) formData.append('program', program);
      if (imageFile) formData.append('image', imageFile);

      if (event?.id) {
        await api.patch(`/events/admin/${event.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Evento atualizado!');
      } else {
        await api.post('/events/admin', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Evento criado!');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar evento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="event-form-overlay" onClick={onClose}>
      <div className="event-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <h2>{event?.id ? 'Editar Evento' : 'Novo Evento'}</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-row">
            <div className="form-group">
              <label>Título *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ex: Aula de Zumba" />
            </div>
            <div className="form-group">
              <label>Categoria *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Descrição</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Detalhes do evento..." />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Data Início *</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Data Fim</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Horário Início</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Horário Fim</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Local</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Sede da Secretaria" />
            </div>
            <div className="form-group">
              <label>Vagas (vazio = ilimitado)</label>
              <input type="number" min="1" value={maxSlots} onChange={(e) => setMaxSlots(e.target.value)} placeholder="Ex: 30" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Setor</label>
              <select value={sector} onChange={(e) => setSector(e.target.value)}>
                <option value="">Nenhum</option>
                {Object.entries(SECTOR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Programa</label>
              <select value={program} onChange={(e) => setProgram(e.target.value)}>
                <option value="">Nenhum</option>
                {Object.entries(PROGRAM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Imagem</label>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-submit" disabled={saving}>
              {saving ? 'Salvando...' : event?.id ? 'Atualizar' : 'Criar Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

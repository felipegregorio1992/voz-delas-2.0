import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/AppLayout';
import './CalendarPage.css';

// ─── Constantes ────────────────────────────────────────────────────────────────

const DAYS_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAYS_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface DayConfig {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isActive: boolean;
}

interface ScheduledAttendance {
  id: string;
  scheduledFor: string;
  status: string;
  notes?: string;
  client?: { id: string; name: string };
  attendant?: { id: string; name: string };
}

interface NewSchedule {
  date: string;
  time: string;
  notes: string;
  clientName: string;
  serviceType: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_HOURS: DayConfig[] = DAYS_FULL.map((_, i) => ({
  dayOfWeek: i,
  openTime: '08:00',
  closeTime: '18:00',
  isActive: i >= 1 && i <= 5,
}));

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function CalendarPage() {
  const today = new Date();
  const { user } = useAuth();
  const canApprove = user?.permissions?.includes('SALA_LILAS_SCHEDULE_MANAGE') || false;

  // Tabs
  const [activeTab, setActiveTab] = useState<'calendar' | 'hours'>('calendar');

  // Calendário
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [schedules, setSchedules] = useState<ScheduledAttendance[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [updatingScheduleId, setUpdatingScheduleId] = useState<string | null>(null);

  // Formulário de novo agendamento
  const [showForm, setShowForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState<NewSchedule>({ date: '', time: '09:00', notes: '', clientName: '', serviceType: '' });
  const [saving, setSaving] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<{ value: string; label: string }[]>([]);

  // Horários de funcionamento
  const [hours, setHours] = useState<DayConfig[]>(DEFAULT_HOURS);
  const [loadingHours, setLoadingHours] = useState(true);
  const [savingHours, setSavingHours] = useState(false);
  const [savedHours, setSavedHours] = useState(false);

  // ── Carregar dados ────────────────────────────────────────────────────────────

  const loadSchedules = useCallback(async () => {
    setLoadingSchedules(true);
    try {
      const res = await api.get('/sala-lilas/attendances/scheduled');
      const data: ScheduledAttendance[] = res.data?.data || res.data || [];
      setSchedules(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSchedules(false);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
    api.get('/operating-hours')
      .then((res) => {
        const data: DayConfig[] = res.data?.data || res.data || [];
        if (data.length > 0) {
          const merged = DEFAULT_HOURS.map((def) => {
            const found = data.find((d) => d.dayOfWeek === def.dayOfWeek);
            return found ? { ...def, ...found } : def;
          });
          setHours(merged);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingHours(false));
    api.get('/sala-lilas/service-types')
      .then((res) => {
        const data = res.data?.data || res.data || [];
        if (Array.isArray(data)) setServiceTypes(data);
      })
      .catch(console.error);
  }, [loadSchedules]);

  // ── Calendário ────────────────────────────────────────────────────────────────

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const schedulesOnDay = (date: Date) =>
    schedules.filter(s => isSameDay(new Date(s.scheduledFor), date));

  const selectedDaySchedules = selectedDate ? schedulesOnDay(selectedDate) : [];

  // ── Novo agendamento ──────────────────────────────────────────────────────────

  const openForm = (date?: Date) => {
    const d = date || selectedDate || today;
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setNewSchedule({ date: iso, time: '09:00', notes: '', clientName: '', serviceType: '' });
    setShowForm(true);
  };

  const handleCreateSchedule = async () => {
    if (!newSchedule.date || !newSchedule.time) return;
    setSaving(true);
    try {
      const scheduledFor = `${newSchedule.date}T${newSchedule.time}:00`;
      // FIX #13: O campo clientName era dead UI — o agendamento sempre usava o usuário logado.
      // Comportamento correto para o painel do atendente: agendar para si mesmo (como atendente)
      // ou para um cliente específico via ID. Por ora, mantemos o comportamento de agendar
      // para o próprio usuário logado (atendente criando slot para si), sem expor o bug.
      const meRes = await api.get('/me');
      const userId = meRes.data?.data?.id || meRes.data?.id;
      if (!userId) throw new Error('Usuário não identificado');
      await api.post(`/sala-lilas/attendances/schedule/${userId}`, {
        scheduledFor,
        notes: newSchedule.notes || undefined,
        serviceType: newSchedule.serviceType || undefined,
      });
      setShowForm(false);
      await loadSchedules();
    } catch (e: any) {
      // FIX #13: Mensagem de erro genérica ao usuário
      const msg = e.response?.status === 403
        ? 'Sem permissão para criar agendamentos.'
        : 'Não foi possível criar o agendamento. Tente novamente.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const scheduleStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pendente';
      case 'APPROVED':
        return 'Aprovado';
      case 'REJECTED':
        return 'Rejeitado';
      case 'COMPLETED':
        return 'Concluído';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const handleApproveSchedule = async (scheduleId: string) => {
    if (!canApprove) return;
    setUpdatingScheduleId(scheduleId);
    try {
      await api.patch(`/sala-lilas/attendances/scheduled/${scheduleId}/approve`);
      await loadSchedules();
    } catch (e: any) {
      const msg = e.response?.status === 403
        ? 'Sem permissão para aprovar agendamentos.'
        : 'Não foi possível aprovar o agendamento. Tente novamente.';
      toast.error(msg);
    } finally {
      setUpdatingScheduleId(null);
    }
  };

  const handleRejectSchedule = async (scheduleId: string) => {
    if (!canApprove) return;
    const ok = window.confirm('Rejeitar este agendamento?');
    if (!ok) return;
    setUpdatingScheduleId(scheduleId);
    try {
      await api.patch(`/sala-lilas/attendances/scheduled/${scheduleId}/reject`);
      await loadSchedules();
    } catch (e: any) {
      const msg = e.response?.status === 403
        ? 'Sem permissão para rejeitar agendamentos.'
        : 'Não foi possível rejeitar o agendamento. Tente novamente.';
      toast.error(msg);
    } finally {
      setUpdatingScheduleId(null);
    }
  };

  // ── Horários de funcionamento ─────────────────────────────────────────────────

  const updateDay = (dayOfWeek: number, field: keyof DayConfig, value: any) => {
    setHours(prev => prev.map(d => d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d));
    setSavedHours(false);
  };

  const handleSaveHours = async () => {
    setSavingHours(true);
    try {
      await api.put('/operating-hours', { hours });
      setSavedHours(true);
      setTimeout(() => setSavedHours(false), 3000);
    } catch (e) {
      toast.error('Erro ao salvar horários.');
    } finally {
      setSavingHours(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const calendarCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <AppLayout>
      <div className="cal-page">

        {/* ── Cabeçalho ── */}
        <div className="cal-top">
          <div>
            <h1>📅 Calendário</h1>
            <p>Agendamentos e horários de funcionamento da Sala Lilás Virtual</p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="cal-tabs">
          <button className={activeTab === 'calendar' ? 'tab-active' : ''} onClick={() => setActiveTab('calendar')}>
            📅 Agendamentos
          </button>
          <button className={activeTab === 'hours' ? 'tab-active' : ''} onClick={() => setActiveTab('hours')}>
            🕐 Horários de Funcionamento
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: AGENDAMENTOS
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'calendar' && (
          <div className="cal-body">

            {/* Calendário visual */}
            <div className="cal-main">
              <div className="cal-nav">
                <button onClick={prevMonth}>‹</button>
                <span>{MONTHS[viewMonth]} {viewYear}</span>
                <button onClick={nextMonth}>›</button>
              </div>

              <div className="cal-grid-header">
                {DAYS_WEEK.map(d => <div key={d}>{d}</div>)}
              </div>

              <div className="cal-grid">
                {calendarCells.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} className="cal-cell cal-empty" />;
                  const cellDate = new Date(viewYear, viewMonth, day);
                  const isToday = isSameDay(cellDate, today);
                  const isSelected = selectedDate ? isSameDay(cellDate, selectedDate) : false;
                  const daySchedules = schedulesOnDay(cellDate);
                  return (
                    <div
                      key={day}
                      className={`cal-cell ${isToday ? 'cal-today' : ''} ${isSelected ? 'cal-selected' : ''} ${daySchedules.length > 0 ? 'cal-has-events' : ''}`}
                      onClick={() => setSelectedDate(cellDate)}
                    >
                      <span className="cal-day-num">{day}</span>
                      {daySchedules.length > 0 && (
                        <span className="cal-dot-count">{daySchedules.length}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <button className="btn-new-schedule" onClick={() => openForm()}>
                + Novo Agendamento
              </button>
            </div>

            {/* Painel lateral: detalhes do dia selecionado */}
            <div className="cal-side">
              {selectedDate ? (
                <>
                  <div className="cal-side-header">
                    <h3>
                      {DAYS_FULL[selectedDate.getDay()]},{' '}
                      {selectedDate.getDate()} de {MONTHS[selectedDate.getMonth()]}
                    </h3>
                    <button className="btn-add-day" onClick={() => openForm(selectedDate)}>+ Agendar</button>
                  </div>

                  {loadingSchedules ? (
                    <p className="cal-side-empty">Carregando...</p>
                  ) : selectedDaySchedules.length === 0 ? (
                    <p className="cal-side-empty">Nenhum agendamento neste dia.</p>
                  ) : (
                    <div className="schedule-list">
                      {selectedDaySchedules.map(s => {
                        const dt = new Date(s.scheduledFor);
                        const time = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        const isUpdating = updatingScheduleId === s.id;
                        return (
                          <div key={s.id} className={`schedule-item status-${s.status.toLowerCase()}`}>
                            <div className="schedule-time">{time}</div>
                            <div className="schedule-info">
                              <span className="schedule-client">
                                {s.client?.name || 'Cliente não identificado'}
                              </span>
                              {(s as any).serviceType && (
                                <span className="schedule-service-type">
                                  {serviceTypes.find(st => st.value === (s as any).serviceType)?.label || (s as any).serviceType}
                                </span>
                              )}
                              {s.attendant && (
                                <span className="schedule-attendant">Atendente: {s.attendant.name}</span>
                              )}
                              {s.notes && <span className="schedule-notes">{s.notes}</span>}
                              {canApprove && s.status === 'PENDING' && (
                                <div className="schedule-actions">
                                  <button
                                    className="btn-schedule-reject"
                                    onClick={() => handleRejectSchedule(s.id)}
                                    disabled={isUpdating}
                                  >
                                    {isUpdating ? '...' : 'Rejeitar'}
                                  </button>
                                  <button
                                    className="btn-schedule-approve"
                                    onClick={() => handleApproveSchedule(s.id)}
                                    disabled={isUpdating}
                                  >
                                    {isUpdating ? '...' : 'Aprovar'}
                                  </button>
                                </div>
                              )}
                            </div>
                            <span className={`schedule-badge badge-${s.status.toLowerCase()}`}>
                              {scheduleStatusLabel(s.status)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="cal-side-placeholder">
                  <span>📅</span>
                  <p>Selecione um dia no calendário para ver os agendamentos</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: HORÁRIOS DE FUNCIONAMENTO
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'hours' && (
          <div className="hours-body">
            <div className="hours-top">
              <p>Defina os dias e horários em que a Sala Lilás Virtual estará disponível para atendimento.</p>
              <button
                className={`btn-save-hours ${savedHours ? 'btn-saved' : ''}`}
                onClick={handleSaveHours}
                disabled={savingHours || loadingHours}
              >
                {savingHours ? 'Salvando...' : savedHours ? '✓ Salvo' : 'Salvar Horários'}
              </button>
            </div>

            {loadingHours ? (
              <p className="cal-side-empty">Carregando...</p>
            ) : (
              <>
                <div className="hours-grid">
                  {hours.map((day) => (
                    <div key={day.dayOfWeek} className={`hours-card ${day.isActive ? 'hours-active' : 'hours-inactive'}`}>
                      <div className="hours-card-header">
                        <div className="hours-day-name">
                          <span className="hours-day-short">{DAYS_WEEK[day.dayOfWeek]}</span>
                          <span className="hours-day-full">{DAYS_FULL[day.dayOfWeek]}</span>
                        </div>
                        <label className="toggle">
                          <input
                            type="checkbox"
                            checked={day.isActive}
                            onChange={(e) => updateDay(day.dayOfWeek, 'isActive', e.target.checked)}
                          />
                          <span className="toggle-slider" />
                          <span className="toggle-label">{day.isActive ? 'Aberto' : 'Fechado'}</span>
                        </label>
                      </div>

                      {day.isActive ? (
                        <div className="hours-times">
                          <div className="time-field">
                            <label>Abertura</label>
                            <input type="time" value={day.openTime}
                              onChange={(e) => updateDay(day.dayOfWeek, 'openTime', e.target.value)} />
                          </div>
                          <span className="time-sep">até</span>
                          <div className="time-field">
                            <label>Fechamento</label>
                            <input type="time" value={day.closeTime}
                              onChange={(e) => updateDay(day.dayOfWeek, 'closeTime', e.target.value)} />
                          </div>
                        </div>
                      ) : (
                        <div className="hours-closed">Sem atendimento</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Tabela resumo */}
                <div className="hours-summary">
                  <h3>Resumo semanal</h3>
                  <table>
                    <thead>
                      <tr><th>Dia</th><th>Status</th><th>Horário</th></tr>
                    </thead>
                    <tbody>
                      {hours.map(day => (
                        <tr key={day.dayOfWeek} className={day.isActive ? '' : 'row-off'}>
                          <td>{DAYS_FULL[day.dayOfWeek]}</td>
                          <td>
                            <span className={`pill ${day.isActive ? 'pill-open' : 'pill-closed'}`}>
                              {day.isActive ? 'Aberto' : 'Fechado'}
                            </span>
                          </td>
                          <td>{day.isActive ? `${day.openTime} – ${day.closeTime}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODAL: Novo Agendamento
        ══════════════════════════════════════════════════════════════════════ */}
        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Novo Agendamento</h2>
                <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
              </div>

              <div className="modal-body">
                <div className="form-row">
                  <label>Data *</label>
                  <input
                    type="date"
                    value={newSchedule.date}
                    min={today.toISOString().split('T')[0]}
                    onChange={e => setNewSchedule(s => ({ ...s, date: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <label>Horário *</label>
                  <input
                    type="time"
                    value={newSchedule.time}
                    onChange={e => setNewSchedule(s => ({ ...s, time: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <label>Tipo de Atendimento</label>
                  <select
                    value={newSchedule.serviceType}
                    onChange={e => setNewSchedule(s => ({ ...s, serviceType: e.target.value }))}
                  >
                    <option value="">Selecione o serviço desejado...</option>
                    {serviceTypes.map(st => (
                      <option key={st.value} value={st.value}>{st.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <label>Observações</label>
                  <textarea
                    rows={3}
                    placeholder="Informações adicionais sobre o agendamento..."
                    value={newSchedule.notes}
                    onChange={e => setNewSchedule(s => ({ ...s, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setShowForm(false)}>Cancelar</button>
                <button
                  className="btn-confirm"
                  onClick={handleCreateSchedule}
                  disabled={saving || !newSchedule.date || !newSchedule.time}
                >
                  {saving ? 'Salvando...' : 'Confirmar Agendamento'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}

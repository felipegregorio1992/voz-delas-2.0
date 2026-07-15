import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { connectAttendanceEvents, disconnectAttendanceEvents } from '../services/attendanceEventsService';
import AppLayout from '../components/AppLayout';
import './SalaLilasPage.css';

export default function SalaLilasPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeAttendances, setActiveAttendances] = useState<any[]>([]);
  const [completedAttendances, setCompletedAttendances] = useState<any[]>([]);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [indicators, setIndicators] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<'attendances' | 'completed' | 'indicators'>('attendances');

  const socketRef = useRef<any>(null);

  useEffect(() => {
    loadData();

    // FIX #14: Não ler accessToken do localStorage — tokens estão em cookies HttpOnly.
    // Buscar token de curta duração via endpoint autenticado por cookie.
    const connectWs = async () => {
      if (!user?.permissions?.includes('SALA_LILAS_ACCESS')) return;
      try {
        const tokenRes = await fetch('/api/v1/auth/ws-token', {
          method: 'POST',
          credentials: 'include',
        });
        if (!tokenRes.ok) return;
        const tokenData = await tokenRes.json();
        const wsToken = tokenData?.data?.token;
        if (!wsToken) return;

        const socket = connectAttendanceEvents(wsToken);
        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('✅ Conectado aos eventos de atendimentos');
        });

        socket.on('disconnect', () => {
          console.log('❌ Desconectado dos eventos de atendimentos');
        });

        socket.on('new-attendance', (attendance: any) => {
          setActiveAttendances((prev) => {
            const exists = prev.some((a: any) => a.id === attendance.id);
            if (!exists && (attendance.status === 'PENDING' || attendance.status === 'IN_PROGRESS')) {
              return [attendance, ...prev];
            }
            return prev;
          });
        });

        socket.on('attendance-updated', (attendance: any) => {
          setActiveAttendances((prev) =>
            prev.map((a: any) => (a.id === attendance.id ? attendance : a)),
          );
        });

        socket.on('attendance-removed', (data: { attendanceId: string }) => {
          setActiveAttendances((prev) => prev.filter((a: any) => a.id !== data.attendanceId));
        });

        socket.on('error', (error: any) => {
          console.error('Erro no WebSocket de atendimentos:', error);
        });
      } catch (err) {
        console.error('Erro ao conectar WebSocket de atendimentos:', err);
      }
    };

    connectWs();

    return () => {
      disconnectAttendanceEvents();
    };
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [attendancesRes, indicatorsRes] = await Promise.all([
        api.get('/sala-lilas/attendances/active').catch(() => ({ data: { data: [] } })),
        api.get('/sala-lilas/admin/indicators').catch(() => ({ data: { data: null } })),
      ]);

      const attendances = attendancesRes.data?.data || attendancesRes.data || [];
      const indicatorsData = indicatorsRes.data?.data || indicatorsRes.data || null;

      setActiveAttendances(Array.isArray(attendances) ? attendances : []);
      setIndicators(indicatorsData);
    } catch (error: any) {
      console.error('❌ Erro ao carregar dados da Sala Lilás:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedAttendances = async () => {
    try {
      setLoadingCompleted(true);
      const response = await api.get('/sala-lilas/attendances', {
        params: {
          status: 'COMPLETED',
          limit: 50,
        },
      });

      const attendances = response.data?.data || response.data || [];
      setCompletedAttendances(Array.isArray(attendances) ? attendances : []);
    } catch (error: any) {
      console.error('❌ Erro ao carregar atendimentos concluídos:', error);
      toast.error('Erro ao carregar atendimentos concluídos');
    } finally {
      setLoadingCompleted(false);
    }
  };

  if (loading) {
    return (
      <div className="sala-lilas-loading">
        <div>Carregando Sala Lilás Virtual...</div>
      </div>
    );
  }

  return (
    <AppLayout>
    <div className="sala-lilas-page">
      <div className="sala-lilas-content">
        <div className="sala-lilas-info-card">
          <h2>Bem-vinda à Sala Lilás Virtual</h2>
          <p>
            Ambiente digital seguro de acolhimento, destinado ao atendimento humanizado 
            de mulheres em situação de violência, por meio de chat, formulário eletrônico 
            e videoatendimento.
          </p>
          <div className="info-features">
            <div className="feature-item">
              <span className="feature-icon">💬</span>
              <div>
                <strong>Chat Seguro</strong>
                <p>Atendimento em tempo real com mensagens criptografadas</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📝</span>
              <div>
                <strong>Formulário de Acolhimento</strong>
                <p>Preencha no seu ritmo, com salvamento automático</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎥</span>
              <div>
                <strong>Videoatendimento</strong>
                <p>Atendimento por vídeo quando necessário</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <div>
                <strong>Sigilo Absoluto</strong>
                <p>Seus dados são protegidos com criptografia</p>
              </div>
            </div>
          </div>
        </div>

        <div className="sala-lilas-tabs">
          <button
            className={`sala-lilas-tab ${selectedTab === 'attendances' ? 'active' : ''}`}
            onClick={() => setSelectedTab('attendances')}
          >
            Atendimentos Ativos
            {activeAttendances.length > 0 && (
              <span className="badge">{activeAttendances.length}</span>
            )}
          </button>
          <button
            className={`sala-lilas-tab ${selectedTab === 'completed' ? 'active' : ''}`}
            onClick={() => {
              setSelectedTab('completed');
              if (completedAttendances.length === 0) {
                loadCompletedAttendances();
              }
            }}
          >
            Atendimentos Concluídos
            {completedAttendances.length > 0 && (
              <span className="badge">{completedAttendances.length}</span>
            )}
          </button>
          {user?.permissions?.includes('SALA_LILAS_ACCESS') && (
            <button
              className={`sala-lilas-tab ${selectedTab === 'indicators' ? 'active' : ''}`}
              onClick={() => setSelectedTab('indicators')}
            >
              Indicadores
            </button>
          )}
        </div>

        <div className="sala-lilas-main-content">
          {selectedTab === 'attendances' ? (
            <div className="attendances-list">
              {activeAttendances.length === 0 ? (
                <div className="empty-state">
                  <p>Nenhum atendimento ativo no momento.</p>
                  <button 
                    className="btn-new-attendance"
                    onClick={() => {
                      // Criar novo atendimento
                      api.post('/sala-lilas/attendances', {
                        type: 'ANONYMOUS'
                      }).then((res) => {
                        const attendance = res.data?.data || res.data;
                        if (attendance?.id) {
                          navigate(`/sala-lilas/attendance/${attendance.id}`);
                        }
                      }).catch((error) => {
                        console.error('Erro ao criar atendimento:', error);
                        toast.error('Erro ao criar atendimento. Tente novamente.');
                      });
                    }}
                  >
                    + Iniciar Novo Atendimento
                  </button>
                </div>
              ) : (
                <div className="attendances-grid">
                  {activeAttendances.map((attendance: any) => (
                    <div key={attendance.id} className="attendance-card">
                      <div className="attendance-header">
                        <h3>Atendimento #{attendance.id.substring(0, 8)}</h3>
                        <span className={`status-badge status-${attendance.status.toLowerCase()}`}>
                          {attendance.status === 'PENDING' ? 'Pendente' : 
                           attendance.status === 'IN_PROGRESS' ? 'Em Andamento' : 
                           attendance.status}
                        </span>
                      </div>
                      <div className="attendance-info">
                        <p><strong>Tipo:</strong> {
                          attendance.type === 'IDENTIFIED' ? 'Identificado' :
                          attendance.type === 'SEMI_IDENTIFIED' ? 'Semi-identificado' :
                          'Anônimo'
                        }</p>
                        <p><strong>Criado em:</strong> {new Date(attendance.createdAt).toLocaleString('pt-BR')}</p>
                        {attendance.form && (
                          <p><strong>Formulário:</strong> {
                            attendance.form.isComplete ? '✅ Completo' : '📝 Em preenchimento'
                          }</p>
                        )}
                        {attendance.consentTerm && (
                          <p><strong>Consentimento:</strong> {
                            attendance.consentTerm.status === 'ACCEPTED' ? '✅ Aceito' :
                            attendance.consentTerm.status === 'REJECTED' ? '❌ Rejeitado' :
                            '⏳ Pendente'
                          }</p>
                        )}
                      </div>
                      <button
                        className="btn-open-attendance"
                        onClick={() => navigate(`/sala-lilas/attendance/${attendance.id}`)}
                      >
                        Abrir Atendimento
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : selectedTab === 'completed' ? (
            <div className="attendances-list">
              {loadingCompleted ? (
                <div className="empty-state">
                  <p>Carregando atendimentos concluídos...</p>
                </div>
              ) : completedAttendances.length === 0 ? (
                <div className="empty-state">
                  <p>Nenhum atendimento concluído encontrado.</p>
                </div>
              ) : (
                <div className="attendances-grid">
                  {completedAttendances.map((attendance: any) => (
                    <div key={attendance.id} className="attendance-card completed">
                      <div className="attendance-header">
                        <h3>Atendimento #{attendance.id.substring(0, 8)}</h3>
                        <span className="status-badge status-completed">
                          ✅ Concluído
                        </span>
                      </div>
                      <div className="attendance-info">
                        <p><strong>Tipo:</strong> {
                          attendance.type === 'IDENTIFIED' ? 'Identificado' :
                          attendance.type === 'SEMI_IDENTIFIED' ? 'Semi-identificado' :
                          'Anônimo'
                        }</p>
                        <p><strong>Criado em:</strong> {new Date(attendance.createdAt).toLocaleString('pt-BR')}</p>
                        {attendance.startedAt && (
                          <p><strong>Iniciado em:</strong> {new Date(attendance.startedAt).toLocaleString('pt-BR')}</p>
                        )}
                        {attendance.endedAt && (
                          <p><strong>Finalizado em:</strong> {new Date(attendance.endedAt).toLocaleString('pt-BR')}</p>
                        )}
                        {attendance.riskLevel && (
                          <p><strong>Nível de Risco:</strong> <span className={`risk-level risk-${attendance.riskLevel.toLowerCase()}`}>
                            {attendance.riskLevel === 'LOW' ? 'Baixo' :
                             attendance.riskLevel === 'MEDIUM' ? 'Médio' :
                             attendance.riskLevel === 'HIGH' ? 'Alto' : attendance.riskLevel}
                          </span></p>
                        )}
                        {attendance.form && (
                          <p><strong>Formulário:</strong> {
                            attendance.form.isComplete ? '✅ Completo' : '📝 Incompleto'
                          }</p>
                        )}
                        {attendance.observations && (
                          <div className="attendance-observations">
                            <strong>Observações:</strong>
                            <p className="observations-text">{attendance.observations}</p>
                          </div>
                        )}
                      </div>
                      <button
                        className="btn-open-attendance"
                        onClick={() => navigate(`/sala-lilas/attendance/${attendance.id}`)}
                      >
                        Ver Detalhes
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="indicators-content">
              {indicators ? (
                <div className="indicators-grid">
                  <div className="indicator-card">
                    <h3>Total de Atendimentos</h3>
                    <p className="indicator-value">{indicators.totalAttendances || 0}</p>
                  </div>
                  <div className="indicator-card">
                    <h3>Atendimentos Ativos</h3>
                    <p className="indicator-value active">{indicators.activeAttendances || 0}</p>
                  </div>
                  <div className="indicator-card">
                    <h3>Atendimentos Concluídos</h3>
                    <p className="indicator-value">{indicators.completedAttendances || 0}</p>
                  </div>
                  <div className="indicator-card">
                    <h3>Pendentes</h3>
                    <p className="indicator-value">{indicators.pendingAttendances || 0}</p>
                  </div>
                  <div className="indicator-card">
                    <h3>Formulários</h3>
                    <p className="indicator-value">{indicators.totalForms || 0}</p>
                    <p className="indicator-sub">{indicators.completedForms || 0} completos</p>
                  </div>
                  <div className="indicator-card">
                    <h3>Encaminhamentos</h3>
                    <p className="indicator-value">{indicators.totalReferrals || 0}</p>
                  </div>
                  <div className="indicator-card">
                    <h3>Agendamentos</h3>
                    <p className="indicator-value">{indicators.totalScheduled || 0}</p>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p>Indicadores não disponíveis.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </AppLayout>
  );
}

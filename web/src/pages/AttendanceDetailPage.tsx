import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import ChatComponent from '../components/ChatComponent';
import VideoCallComponent from '../components/VideoCallComponent';
import AppLayout from '../components/AppLayout';
import './AttendanceDetailPage.css';

export default function AttendanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [observations, setObservations] = useState('');
  const [riskLevel, setRiskLevel] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);

  useEffect(() => {
    if (id) {
      loadAttendance();
    }
  }, [id]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      setError(null);

      const [attendanceRes, formRes] = await Promise.all([
        api.get(`/sala-lilas/attendances/${id}`).catch((err) => {
          throw err;
        }),
        api.get(`/sala-lilas/attendances/${id}/form`).catch(() => ({ data: { data: null } })),
      ]);

      const attendanceData = attendanceRes.data?.data || attendanceRes.data;
      const formData = formRes.data?.data || formRes.data;

      if (!attendanceData) {
        throw new Error('Atendimento não encontrado');
      }

      setAttendance(attendanceData);
      setForm(formData);
      setObservations(attendanceData?.observations || '');
      setRiskLevel(attendanceData?.riskLevel || '');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Erro ao carregar atendimento');
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAttendance = async () => {
    if (!id) return;

    try {
      setSaving(true);
      const response = await api.patch(`/sala-lilas/attendances/${id}`, {
        observations,
        riskLevel: riskLevel || undefined,
      });

      // Atualizar apenas as propriedades específicas sem substituir o objeto inteiro
      // Isso evita re-renderizar o ChatComponent e perder a conexão WebSocket
      const updatedData = response.data?.data || response.data;
      if (updatedData) {
        setAttendance((prev: any) => ({
          ...prev,
          observations: updatedData.observations,
          riskLevel: updatedData.riskLevel,
          updatedAt: updatedData.updatedAt,
        }));
        setObservations(updatedData.observations || '');
        setRiskLevel(updatedData.riskLevel || '');
      }

      toast.success('Atendimento atualizado com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao atualizar atendimento: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleClassifyRisk = async (level: string) => {
    if (!id) return;

    try {
      setSaving(true);
      const response = await api.post(`/sala-lilas/attendances/${id}/risk`, {
        riskLevel: level,
      });

      // Atualizar apenas a propriedade riskLevel sem substituir o objeto inteiro
      const updatedData = response.data?.data || response.data;
      setRiskLevel(level);
      setAttendance((prev: any) => ({
        ...prev,
        riskLevel: level,
        updatedAt: updatedData?.updatedAt || new Date().toISOString(),
      }));

      toast.success('Risco classificado com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao classificar risco: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="attendance-detail-loading">
        <div>Carregando atendimento...</div>
      </div>
    );
  }

  if (error || !attendance) {
    return (
      <div className="attendance-detail-error">
        <div>
          <h2>Erro</h2>
          <p>{error || 'Atendimento não encontrado'}</p>
          <button onClick={() => navigate('/sala-lilas')}>Voltar</button>
        </div>
      </div>
    );
  }

  const isAttendant = user?.permissions?.includes('SALA_LILAS_ACCESS') || false;
  const status = attendance.status || 'PENDING';

  return (
    <AppLayout>
    <div className="attendance-detail-page">
      <div className="attendance-detail-content">
        {/* Informações do Atendimento */}
        <div className="info-section">
          <h2>Informações do Atendimento</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Tipo:</label>
              <span>
                {attendance.type === 'IDENTIFIED' ? 'Identificado' :
                 attendance.type === 'SEMI_IDENTIFIED' ? 'Semi-identificado' :
                 attendance.type === 'ANONYMOUS' ? 'Anônimo' : attendance.type}
              </span>
            </div>
            <div className="info-item">
              <label>Criado em:</label>
              <span>{new Date(attendance.createdAt).toLocaleString('pt-BR')}</span>
            </div>
            {attendance.startedAt && (
              <div className="info-item">
                <label>Iniciado em:</label>
                <span>{new Date(attendance.startedAt).toLocaleString('pt-BR')}</span>
              </div>
            )}
            {attendance.endedAt && (
              <div className="info-item">
                <label>Finalizado em:</label>
                <span>{new Date(attendance.endedAt).toLocaleString('pt-BR')}</span>
              </div>
            )}
            {attendance.riskLevel && (
              <div className="info-item">
                <label>Nível de Risco:</label>
                <span className={`risk-level risk-${attendance.riskLevel.toLowerCase()}`}>
                  {attendance.riskLevel === 'LOW' ? 'Baixo' :
                   attendance.riskLevel === 'MEDIUM' ? 'Médio' :
                   attendance.riskLevel === 'HIGH' ? 'Alto' : attendance.riskLevel}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Formulário de Acolhimento */}
        {form && (
          <div className="info-section">
            <h2>Formulário de Acolhimento</h2>
            <div className="form-status">
              {form.isComplete ? (
                <span className="status-complete">✅ Formulário completo</span>
              ) : (
                <span className="status-incomplete">📝 Formulário em preenchimento</span>
              )}
            </div>
            {form.formData && (() => {
              try {
                const parsed = JSON.parse(form.formData);
                const fieldLabels: Record<string, string> = {
                  como_voce_esta: 'Como você está',
                  precisa_de_ajuda: 'Precisa de ajuda',
                  nome: 'Nome',
                  idade: 'Idade',
                  telefone: 'Telefone',
                  endereco: 'Endereço',
                  descricao: 'Descrição',
                  tipo_violencia: 'Tipo de violência',
                  agressor: 'Agressor',
                  filhos: 'Filhos',
                  situacao: 'Situação',
                  observacoes: 'Observações',
                };
                return (
                  <div className="form-fields">
                    {Object.entries(parsed).map(([key, value]) => (
                      <div key={key} className="form-field-row">
                        <span className="form-field-label">
                          {fieldLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                        <span className="form-field-value">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                );
              } catch {
                return <p className="form-field-value">{form.formData}</p>;
              }
            })()}
          </div>
        )}

        {/* Termo de Consentimento */}
        {attendance.consentTerm && (
          <div className="info-section">
            <h2>Termo de Consentimento</h2>
            <div className="consent-status">
              {attendance.consentTerm.status === 'ACCEPTED' ? (
                <span className="status-accepted">✅ Aceito</span>
              ) : attendance.consentTerm.status === 'REJECTED' ? (
                <span className="status-rejected">❌ Rejeitado</span>
              ) : (
                <span className="status-pending">⏳ Pendente</span>
              )}
              {attendance.consentTerm.acceptedAt && (
                <p>Aceito em: {new Date(attendance.consentTerm.acceptedAt).toLocaleString('pt-BR')}</p>
              )}
            </div>
          </div>
        )}

        {/* Comunicação em Tempo Real */}
        {attendance.consentTerm?.status === 'ACCEPTED' && id && (
          <div className="info-section communication-section">
            <div className="communication-header">
              <h2>💬 Comunicação</h2>
              <div className="communication-tabs">
                <button
                  className={`comm-tab ${!showVideoCall ? 'active' : ''}`}
                  onClick={() => setShowVideoCall(false)}
                >
                  💬 Chat
                </button>
                <button
                  className={`comm-tab ${showVideoCall ? 'active' : ''}`}
                  onClick={() => setShowVideoCall(true)}
                >
                  🎥 Vídeo
                </button>
              </div>
            </div>
            
            <div className="communication-content">
              {!showVideoCall ? (
                <ChatComponent attendanceId={id} />
              ) : (
                <div className="video-call-container-wrapper">
                  <VideoCallComponent
                    attendanceId={id}
                    onEndCall={() => setShowVideoCall(false)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Área do Atendente */}
        {isAttendant && (
          <>
            <div className="info-section">
              <h2>Observações do Atendimento</h2>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Registre observações sobre o atendimento..."
                rows={5}
                className="observations-textarea"
              />
              <div className="actions">
                <button
                  onClick={handleUpdateAttendance}
                  disabled={saving}
                  className="btn-save"
                >
                  {saving ? 'Salvando...' : 'Salvar Observações'}
                </button>
                {status === 'PENDING' && (
                  <button
                    onClick={async () => {
                      try {
                        setSaving(true);
                        const response = await api.patch(`/sala-lilas/attendances/${id}`, { status: 'IN_PROGRESS' });
                        const updatedData = response.data?.data || response.data;
                        // Atualizar apenas o status e startedAt
                        setAttendance((prev: any) => ({
                          ...prev,
                          status: 'IN_PROGRESS',
                          startedAt: updatedData?.startedAt || new Date().toISOString(),
                          updatedAt: updatedData?.updatedAt || new Date().toISOString(),
                        }));
                        toast.success('Atendimento iniciado!');
                      } catch (err: any) {
                        toast.error('Erro ao iniciar atendimento: ' + (err.response?.data?.message || err.message));
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                    className="btn-start"
                  >
                    Iniciar Atendimento
                  </button>
                )}
                {status === 'IN_PROGRESS' && (
                  <button
                    onClick={async () => {
                      try {
                        setSaving(true);
                        const response = await api.patch(`/sala-lilas/attendances/${id}`, { status: 'COMPLETED' });
                        const updatedData = response.data?.data || response.data;
                        // Atualizar apenas o status e endedAt
                        setAttendance((prev: any) => ({
                          ...prev,
                          status: 'COMPLETED',
                          endedAt: updatedData?.endedAt || new Date().toISOString(),
                          updatedAt: updatedData?.updatedAt || new Date().toISOString(),
                        }));
                        toast.success('Atendimento finalizado!');
                      } catch (err: any) {
                        toast.error('Erro ao finalizar atendimento: ' + (err.response?.data?.message || err.message));
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                    className="btn-complete"
                  >
                    Finalizar Atendimento
                  </button>
                )}
              </div>
            </div>

            <div className="info-section">
              <h2>Classificação de Risco</h2>
              <div className="risk-buttons">
                <button
                  onClick={() => handleClassifyRisk('LOW')}
                  className={`btn-risk ${riskLevel === 'LOW' ? 'active' : ''}`}
                >
                  Baixo
                </button>
                <button
                  onClick={() => handleClassifyRisk('MEDIUM')}
                  className={`btn-risk ${riskLevel === 'MEDIUM' ? 'active' : ''}`}
                >
                  Médio
                </button>
                <button
                  onClick={() => handleClassifyRisk('HIGH')}
                  className={`btn-risk ${riskLevel === 'HIGH' ? 'active' : ''}`}
                >
                  Alto
                </button>
              </div>
            </div>

            {/* Encaminhamentos */}
            {attendance.referrals && attendance.referrals.length > 0 && (
              <div className="info-section">
                <h2>Encaminhamentos</h2>
                <div className="referrals-list">
                  {attendance.referrals.map((referral: any) => (
                    <div key={referral.id} className="referral-item">
                      <p><strong>Serviço:</strong> {referral.service?.name || 'N/A'}</p>
                      <p><strong>Data:</strong> {new Date(referral.createdAt).toLocaleString('pt-BR')}</p>
                      {referral.notes && <p><strong>Notas:</strong> {referral.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </AppLayout>
  );
}

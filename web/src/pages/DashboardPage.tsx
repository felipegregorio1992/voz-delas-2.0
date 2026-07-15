import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import MapView from '../components/MapView';
import IncidentsList from '../components/IncidentsList';
import PanicEventsList from '../components/PanicEventsList';
import MerchantRequestsList from '../components/MerchantRequestsList';
import SupportServicesList from '../components/SupportServicesList';
import SupportServiceForm from '../components/SupportServiceForm';
import MerchantsList from '../components/MerchantsList';
import AppLayout from '../components/AppLayout';
import './DashboardPage.css';

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
    accuracy: number;
    createdAt: string;
  }>;
}

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
    trustedContacts?: Array<{
      name: string;
      phone: string;
    }>;
  };
  locations: Array<{
    id: string;
    lat: number;
    lng: number;
    accuracy: number;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [panicEvents, setPanicEvents] = useState<PanicEvent[]>([]);
  const [activePanicEvents, setActivePanicEvents] = useState<PanicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'incidents' | 'panic' | 'merchants' | 'stores' | 'support'>('panic');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [merchantRequests, setMerchantRequests] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [supportServices, setSupportServices] = useState<any[]>([]);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);

  const permissions = user?.permissions || [];

  const loadData = async () => {
    try {
      const canSeeIncidents = permissions.includes('INCIDENTS_VIEW');
      const canSeePanic = permissions.includes('PANIC_VIEW');
      const canSeeMerchantRequests = permissions.includes('MERCHANT_REQUESTS_MANAGE');
      const canSeeSupportServices = permissions.includes('SUPPORT_SERVICES_MANAGE');
      const canSeeMerchants = permissions.includes('MERCHANTS_VIEW');

      const [incidentsRes, panicRes, activePanicRes, merchantRequestsRes, supportServicesRes, merchantsRes] = await Promise.all([
        canSeeIncidents
          ? api.get('/admin/incidents').catch(() => ({ data: { data: [] } }))
          : Promise.resolve({ data: { data: [] } }),
        canSeePanic
          ? api.get('/admin/panic').catch(() => ({ data: { data: [] } }))
          : Promise.resolve({ data: { data: [] } }),
        canSeePanic
          ? api.get('/admin/panic/active').catch(() => ({ data: { data: [] } }))
          : Promise.resolve({ data: { data: [] } }),
        canSeeMerchantRequests
          ? api.get('/merchant-requests/pending').catch(() => ({ data: { data: [] } }))
          : Promise.resolve({ data: { data: [] } }),
        canSeeSupportServices
          ? api.get('/support-services/admin/all').catch(() => ({ data: { data: [] } }))
          : Promise.resolve({ data: { data: [] } }),
        canSeeMerchants
          ? api.get('/merchants/admin/all').catch(() => ({ data: { data: [] } }))
          : Promise.resolve({ data: { data: [] } }),
      ]);

      const incidents = incidentsRes.data?.data || incidentsRes.data || [];
      const panicEvents = panicRes.data?.data || panicRes.data || [];
      const activePanicEvents = activePanicRes.data?.data || activePanicRes.data || [];
      const merchantRequests = merchantRequestsRes.data?.data || merchantRequestsRes.data || [];
      const supportServices = supportServicesRes.data?.data || supportServicesRes.data || [];
      const merchants = merchantsRes.data?.data || merchantsRes.data || [];

      setIncidents(Array.isArray(incidents) ? incidents : []);
      setPanicEvents(Array.isArray(panicEvents) ? panicEvents : []);
      setActivePanicEvents(Array.isArray(activePanicEvents) ? activePanicEvents : []);
      setMerchantRequests(Array.isArray(merchantRequests) ? merchantRequests : []);
      setSupportServices(Array.isArray(supportServices) ? supportServices : []);
      setMerchants(Array.isArray(merchants) ? merchants : []);

      const canSeePanicTab = canSeePanic;
      const canSeeIncidentsTab = canSeeIncidents;
      const canSeeMerchantsTab = canSeeMerchantRequests;
      const canSeeStoresTab = canSeeMerchants;
      const canSeeSupportTab = canSeeSupportServices;
      const preferred =
        (canSeePanicTab && 'panic') ||
        (canSeeIncidentsTab && 'incidents') ||
        (canSeeMerchantsTab && 'merchants') ||
        (canSeeStoresTab && 'stores') ||
        (canSeeSupportTab && 'support') ||
        'panic';
      setSelectedTab((prev) => {
        if (prev === 'panic' && !canSeePanicTab) return preferred as any;
        if (prev === 'incidents' && !canSeeIncidentsTab) return preferred as any;
        if (prev === 'merchants' && !canSeeMerchantsTab) return preferred as any;
        if (prev === 'stores' && !canSeeStoresTab) return preferred as any;
        if (prev === 'support' && !canSeeSupportTab) return preferred as any;
        return prev;
      });
    } catch (error: any) {
      if (error.response?.status === 401) {
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Atualizar a cada 10 segundos
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div>Carregando dados...</div>
      </div>
    );
  }

  return (
    <AppLayout>
    <div className="dashboard-page">
      <div className="dashboard-content">
        <div className="dashboard-sidebar">
          <div className="stats-card">
            <h3>Estatísticas</h3>
            <div className="stat-item">
              <span className="stat-label">Pânico Ativo:</span>
              <span className="stat-value active">{activePanicEvents.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Pânico:</span>
              <span className="stat-value">{panicEvents.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Denúncias:</span>
              <span className="stat-value">{incidents.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Solicitações Pendentes:</span>
              <span className="stat-value" style={{ color: merchantRequests.length > 0 ? '#ff9800' : '#333' }}>
                {merchantRequests.length}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Serviços de Apoio:</span>
              <span className="stat-value">{supportServices.length}</span>
            </div>
          </div>

          <div className="tabs">
            {permissions.includes('PANIC_VIEW') && (
              <button
                className={`tab ${selectedTab === 'panic' ? 'active' : ''}`}
                onClick={() => setSelectedTab('panic')}
              >
                Eventos de Pânico
              </button>
            )}
            {permissions.includes('INCIDENTS_VIEW') && (
              <button
                className={`tab ${selectedTab === 'incidents' ? 'active' : ''}`}
                onClick={() => setSelectedTab('incidents')}
              >
                Denúncias
              </button>
            )}
            {permissions.includes('MERCHANT_REQUESTS_MANAGE') && (
              <button
                className={`tab ${selectedTab === 'merchants' ? 'active' : ''}`}
                onClick={() => setSelectedTab('merchants')}
              >
                Solicitações
                {merchantRequests.length > 0 && (
                  <span className="badge">{merchantRequests.length}</span>
                )}
              </button>
            )}
            {permissions.includes('MERCHANTS_VIEW') && (
              <button
                className={`tab ${selectedTab === 'stores' ? 'active' : ''}`}
                onClick={() => setSelectedTab('stores')}
              >
                Lojas Ativas
              </button>
            )}
            {permissions.includes('SUPPORT_SERVICES_MANAGE') && (
              <button
                className={`tab ${selectedTab === 'support' ? 'active' : ''}`}
                onClick={() => setSelectedTab('support')}
              >
                Rede de Apoio
              </button>
            )}
          </div>
        </div>

        <div className="dashboard-main">
          <MapView
            incidents={selectedIncidentId 
              ? incidents.filter(inc => inc.id === selectedIncidentId)
              : []}
            panicEvents={activePanicEvents}
            selectedIncidentId={selectedIncidentId}
          />
          <div className="dashboard-list">
            {selectedTab === 'panic' ? (
              <PanicEventsList events={panicEvents} activeEvents={activePanicEvents} />
            ) : selectedTab === 'incidents' ? (
              <IncidentsList 
                incidents={incidents}
                selectedIncidentId={selectedIncidentId}
                onIncidentClick={(id) => {
                  setSelectedIncidentId(selectedIncidentId === id ? null : id);
                }}
              />
            ) : selectedTab === 'merchants' ? (
              <MerchantRequestsList 
                requests={merchantRequests}
                onUpdate={loadData}
              />
            ) : selectedTab === 'stores' ? (
              <MerchantsList
                merchants={merchants}
                onUpdate={loadData}
              />
            ) : selectedTab === 'support' ? (
              <>
                <div className="support-services-header">
                  <h3>Serviços de Apoio</h3>
                  {permissions.includes('SUPPORT_SERVICES_MANAGE') && (
                    <button
                      className="btn-new-service"
                      onClick={() => {
                        setEditingService(null);
                        setShowSupportForm(true);
                      }}
                    >
                      + Novo Serviço
                    </button>
                  )}
                </div>
                <SupportServicesList
                  services={supportServices}
                  onUpdate={loadData}
                  onEdit={(service) => {
                    setEditingService(service);
                    setShowSupportForm(true);
                  }}
                />
              </>
            ) : (
              <div style={{ padding: 16 }}>Sem acesso.</div>
            )}
          </div>
          {showSupportForm && (
            <SupportServiceForm
              service={editingService}
              onClose={() => {
                setShowSupportForm(false);
                setEditingService(null);
              }}
              onSuccess={() => {
                loadData();
              }}
            />
          )}
        </div>
      </div>
    </div>
    </AppLayout>
  );
}


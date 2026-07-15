import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../services/api';
import AppLayout from '../components/AppLayout';
import toast from 'react-hot-toast';
import './TotemsPage.css';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Totem {
  id: string;
  name: string;
  description?: string;
  address: string;
  lat: number;
  lng: number;
  isActive: boolean;
  createdAt: string;
}

// Componente para capturar clique no mapa
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Geocodificação reversa via Nominatim (OpenStreetMap)
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=pt-BR`
    );
    const data = await res.json();
    return data.display_name || '';
  } catch {
    return '';
  }
}

export default function TotemsPage() {
  const [totems, setTotems] = useState<Totem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTotem, setEditingTotem] = useState<Totem | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formLat, setFormLat] = useState<number>(-22.9191);
  const [formLng, setFormLng] = useState<number>(-42.8183);
  const [saving, setSaving] = useState(false);

  const loadTotems = async () => {
    try {
      const res = await api.get('/totems/admin/all');
      const data = res.data?.data || res.data || [];
      setTotems(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Erro ao carregar totems:', error);
      toast.error('Erro ao carregar totems');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTotems();
  }, []);

  const openForm = (totem?: Totem) => {
    if (totem) {
      setEditingTotem(totem);
      setFormName(totem.name);
      setFormDescription(totem.description || '');
      setFormAddress(totem.address);
      setFormLat(totem.lat);
      setFormLng(totem.lng);
    } else {
      setEditingTotem(null);
      setFormName('');
      setFormDescription('');
      setFormAddress('');
      setFormLat(-22.9191);
      setFormLng(-42.8183);
    }
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingTotem(null);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formAddress.trim()) {
      toast.error('Nome e endereço são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        address: formAddress.trim(),
        lat: formLat,
        lng: formLng,
      };

      if (editingTotem) {
        await api.patch(`/totems/admin/${editingTotem.id}`, payload);
        toast.success('Totem atualizado!');
      } else {
        await api.post('/totems/admin', payload);
        toast.success('Totem cadastrado!');
      }

      closeForm();
      loadTotems();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar totem');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja excluir este totem?')) return;

    try {
      await api.delete(`/totems/admin/${id}`);
      toast.success('Totem excluído!');
      loadTotems();
    } catch (error: any) {
      toast.error('Erro ao excluir totem');
    }
  };

  const handleToggleActive = async (totem: Totem) => {
    try {
      await api.patch(`/totems/admin/${totem.id}`, { isActive: !totem.isActive });
      toast.success(totem.isActive ? 'Totem desativado' : 'Totem ativado');
      loadTotems();
    } catch {
      toast.error('Erro ao alterar status');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="totems-page-loading">
          <div>Carregando totems...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="totems-page">
        <div className="totems-page-header">
          <div className="totems-page-title">
            <h1>📍 Totens de Apoio</h1>
            <p>Cadastre pontos de suporte à mulher que aparecerão no mapa do aplicativo</p>
          </div>
          <button className="btn-new-totem" onClick={() => openForm()}>
            + Novo Totem
          </button>
        </div>

        {/* Mapa com todos os totems */}
        <div className="totems-map-container">
          <MapContainer
            center={[-22.9191, -42.8183]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {totems.map((totem) => (
              <Marker key={totem.id} position={[totem.lat, totem.lng]}>
                <Popup>
                  <strong>{totem.name}</strong>
                  <br />
                  {totem.address}
                  {totem.description && (
                    <>
                      <br />
                      <em>{totem.description}</em>
                    </>
                  )}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Lista de totems */}
        <div className="totems-list">
          {totems.length === 0 ? (
            <p style={{ color: '#888', textAlign: 'center', gridColumn: '1 / -1' }}>
              Nenhum totem cadastrado. Clique em "+ Novo Totem" para começar.
            </p>
          ) : (
            totems.map((totem) => (
              <div key={totem.id} className="totem-card">
                <div className="totem-card-header">
                  <h3 className="totem-card-name">{totem.name}</h3>
                  <span
                    className={`totem-card-status ${
                      totem.isActive ? 'totem-card-status--active' : 'totem-card-status--inactive'
                    }`}
                  >
                    {totem.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="totem-card-info">📍 {totem.address}</p>
                {totem.description && <p className="totem-card-info">📝 {totem.description}</p>}
                <p className="totem-card-info">
                  🌐 {totem.lat.toFixed(5)}, {totem.lng.toFixed(5)}
                </p>
                <div className="totem-card-actions">
                  <button className="btn-edit" onClick={() => openForm(totem)}>
                    ✏️ Editar
                  </button>
                  <button className="btn-edit" onClick={() => handleToggleActive(totem)}>
                    {totem.isActive ? '🔴 Desativar' : '🟢 Ativar'}
                  </button>
                  <button className="btn-delete" onClick={() => handleDelete(totem.id)}>
                    🗑️ Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de formulário */}
      {showForm && (
        <div className="totem-modal-overlay" onClick={closeForm}>
          <div className="totem-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingTotem ? '✏️ Editar Totem' : '📍 Novo Totem'}</h2>

            <div className="totem-form-group">
              <label>Nome *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Totem Praça Central"
              />
            </div>

            <div className="totem-form-group">
              <label>Endereço *</label>
              <input
                type="text"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="Ex: Rua das Flores, 123 - Centro"
              />
            </div>

            <div className="totem-form-group">
              <label>Descrição</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descrição opcional do totem"
                rows={3}
              />
            </div>

            <div className="totem-form-group">
              <label>Localização no mapa (clique para posicionar)</label>
              <div className="totem-form-map">
                <MapContainer
                  center={[formLat, formLng]}
                  zoom={14}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[formLat, formLng]} />
                  <MapClickHandler
                    onMapClick={async (lat, lng) => {
                      setFormLat(lat);
                      setFormLng(lng);
                      const address = await reverseGeocode(lat, lng);
                      if (address) setFormAddress(address);
                    }}
                  />
                </MapContainer>
              </div>
              <p className="totem-form-map-hint">
                Clique no mapa para definir a localização do totem
              </p>
            </div>

            <div className="totem-form-coords">
              <div className="totem-form-group">
                <label>Latitude</label>
                <input
                  type="number"
                  step="0.00001"
                  value={formLat}
                  onChange={(e) => setFormLat(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="totem-form-group">
                <label>Longitude</label>
                <input
                  type="number"
                  step="0.00001"
                  value={formLng}
                  onChange={(e) => setFormLng(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="totem-modal-actions">
              <button className="btn-cancel" onClick={closeForm}>
                Cancelar
              </button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : editingTotem ? 'Salvar alterações' : 'Cadastrar totem'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

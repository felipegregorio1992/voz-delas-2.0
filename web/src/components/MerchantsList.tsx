import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import './MerchantsList.css';

interface Product {
  id: string;
  name: string;
  price: number;
  status: string;
}

interface Merchant {
  id: string;
  businessName: string;
  description?: string;
  phone?: string;
  email?: string;
  city?: string;
  isActive: boolean;
  createdAt: string;
  user: { id: string; name: string; email: string; phone: string };
  products: Product[];
}

interface Props {
  merchants: Merchant[];
  onUpdate: () => void;
}

export default function MerchantsList({ merchants, onUpdate }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleToggle = async (id: string) => {
    setLoadingId(id);
    try {
      await api.patch(`/merchants/admin/${id}/toggle`);
      onUpdate();
    } catch (e) {
      toast.error('Erro ao atualizar loja');
    } finally {
      setLoadingId(null);
    }
  };

  if (merchants.length === 0) {
    return <div className="merchants-empty">Nenhuma loja cadastrada.</div>;
  }

  return (
    <div className="merchants-list">
      {merchants.map((m) => (
        <div key={m.id} className={`merchant-card ${m.isActive ? 'active' : 'inactive'}`}>
          <div className="merchant-card-header">
            <div className="merchant-info">
              <span className={`merchant-status-dot ${m.isActive ? 'on' : 'off'}`} />
              <div>
                <strong>{m.businessName}</strong>
                <span className="merchant-owner">{m.user.name}</span>
              </div>
            </div>
            <div className="merchant-actions">
              <button
                className="btn-expand"
                onClick={() => setExpanded(expanded === m.id ? null : m.id)}
              >
                {expanded === m.id ? '▲' : '▼'}
              </button>
              <button
                className={`btn-toggle ${m.isActive ? 'btn-deactivate' : 'btn-activate'}`}
                onClick={() => handleToggle(m.id)}
                disabled={loadingId === m.id}
              >
                {loadingId === m.id ? '...' : m.isActive ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>

          {expanded === m.id && (
            <div className="merchant-details">
              {m.description && <p className="merchant-desc">{m.description}</p>}
              <div className="merchant-meta">
                {m.city && <span>📍 {m.city}</span>}
                {m.phone && <span>📞 {m.phone}</span>}
                {m.email && <span>✉️ {m.email}</span>}
                <span>👤 {m.user.email}</span>
                <span>📦 {m.products.length} produto(s) ativo(s)</span>
                <span>📅 {new Date(m.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
              {m.products.length > 0 && (
                <div className="merchant-products">
                  <strong>Produtos:</strong>
                  <ul>
                    {m.products.map((p) => (
                      <li key={p.id}>
                        {p.name} — R$ {p.price.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

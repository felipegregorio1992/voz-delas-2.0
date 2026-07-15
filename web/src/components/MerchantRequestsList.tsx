import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import './MerchantRequestsList.css';

interface MerchantRequest {
  id: string;
  userId: string;
  businessName: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
}

interface MerchantRequestsListProps {
  requests: MerchantRequest[];
  onUpdate: () => void;
}

const getStatusLabel = (status: string) => {
  const statuses: Record<string, string> = {
    PENDING: 'Pendente',
    APPROVED: 'Aprovada',
    REJECTED: 'Rejeitada',
  };
  return statuses[status] || status;
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    PENDING: '#ff9800',
    APPROVED: '#4caf50',
    REJECTED: '#f44336',
  };
  return colors[status] || '#666';
};

export default function MerchantRequestsList({ requests, onUpdate }: MerchantRequestsListProps) {
  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/merchant-requests/${id}/status`, {
        status: 'APPROVED',
      });
      toast.success('Solicitação aprovada com sucesso!');
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao aprovar solicitação');
    }
  };

  const handleReject = async (id: string, reason?: string) => {
    const rejectionReason = reason || prompt('Digite o motivo da rejeição:');
    
    if (!rejectionReason || rejectionReason.trim() === '') {
      toast.error('É necessário informar o motivo da rejeição');
      return;
    }

    try {
      await api.patch(`/merchant-requests/${id}/status`, {
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
      });
      toast.success('Solicitação rejeitada');
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao rejeitar solicitação');
    }
  };

  if (requests.length === 0) {
    return (
      <div className="merchant-requests-list empty">
        <p>Nenhuma solicitação encontrada</p>
      </div>
    );
  }

  return (
    <div className="merchant-requests-list">
      <div className="list-header">
        <h3>Solicitações de Empreendedoras ({requests.length})</h3>
      </div>
      <div className="list-content">
        {requests.map((request) => (
          <div key={request.id} className="request-item">
            <div className="request-header">
              <div>
                <h4>{request.businessName}</h4>
                <p className="request-user">Por: {request.user.name}</p>
              </div>
              <span
                className="request-status"
                style={{ backgroundColor: getStatusColor(request.status) }}
              >
                {getStatusLabel(request.status)}
              </span>
            </div>
            <div className="request-body">
              {request.description && (
                <p className="request-description">{request.description}</p>
              )}
              <div className="request-info">
                {request.phone && (
                  <div className="info-row">
                    <strong>Telefone:</strong> {request.phone}
                  </div>
                )}
                {request.email && (
                  <div className="info-row">
                    <strong>Email:</strong> {request.email}
                  </div>
                )}
                {request.address && (
                  <div className="info-row">
                    <strong>Endereço:</strong> {request.address}
                  </div>
                )}
                {request.city && (
                  <div className="info-row">
                    <strong>Cidade:</strong> {request.city}
                  </div>
                )}
                <div className="info-row">
                  <strong>Data:</strong>{' '}
                  {format(new Date(request.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </div>
                {request.status === 'REJECTED' && request.rejectionReason && (
                  <div className="info-row rejection-reason">
                    <strong>Motivo da Rejeição:</strong> {request.rejectionReason}
                  </div>
                )}
              </div>
              {request.status === 'PENDING' && (
                <div className="request-actions">
                  <button
                    className="btn-approve"
                    onClick={() => handleApprove(request.id)}
                  >
                    ✓ Aprovar
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => handleReject(request.id)}
                  >
                    ✕ Rejeitar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

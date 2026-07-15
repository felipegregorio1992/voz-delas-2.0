import { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import './SupportServiceForm.css';

interface SupportService {
  id?: string;
  name: string;
  type: 'CEAM' | 'DEAM' | 'DEFENSORIA' | 'OUTRO';
  phone?: string;
  address?: string;
  hours?: string;
  city?: string;
  isActive?: boolean;
}

interface SupportServiceFormProps {
  service?: SupportService | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SupportServiceForm({ service, onClose, onSuccess }: SupportServiceFormProps) {
  const [formData, setFormData] = useState<SupportService>({
    name: '',
    type: 'CEAM',
    phone: '',
    address: '',
    hours: '',
    city: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name || '',
        type: service.type || 'CEAM',
        phone: service.phone || '',
        address: service.address || '',
        hours: service.hours || '',
        city: service.city || '',
        isActive: service.isActive !== undefined ? service.isActive : true,
      });
    }
  }, [service]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Preparar dados, removendo strings vazias
      const data: any = {
        name: formData.name.trim(),
        type: formData.type,
        isActive: formData.isActive !== undefined ? formData.isActive : true,
      };

      // Adicionar campos opcionais apenas se não estiverem vazios
      if (formData.phone?.trim()) {
        data.phone = formData.phone.trim();
      }
      if (formData.address?.trim()) {
        data.address = formData.address.trim();
      }
      if (formData.hours?.trim()) {
        data.hours = formData.hours.trim();
      }
      if (formData.city?.trim()) {
        data.city = formData.city.trim();
      }

      if (service?.id) {
        await api.patch(`/support-services/admin/${service.id}`, data);
        toast.success('Serviço atualizado com sucesso!');
      } else {
        await api.post('/support-services/admin', data);
        toast.success('Serviço cadastrado com sucesso!');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar serviço:', error);
      
      let errorMessage = 'Erro ao salvar serviço';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Tratar erros de validação do NestJS
        if (errorData.message && Array.isArray(errorData.message)) {
          errorMessage = errorData.message.join(', ');
        } else if (errorData.error) {
          if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData.error.message) {
            errorMessage = errorData.error.message;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
        
        console.error('Detalhes do erro:', errorData);
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="support-service-form-overlay" onClick={onClose}>
      <div className="support-service-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <h2>{service?.id ? 'Editar Serviço' : 'Novo Serviço de Apoio'}</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="support-service-form">
          <div className="form-group">
            <label htmlFor="name">Nome do Serviço *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Ex: CEAM Maricá"
            />
          </div>

          <div className="form-group">
            <label htmlFor="type">Tipo *</label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              required
            >
              <option value="CEAM">CEAM</option>
              <option value="DEAM">DEAM</option>
              <option value="DEFENSORIA">Defensoria</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="phone">Telefone</label>
            <input
              id="phone"
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+5521999999999"
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Endereço</label>
            <input
              id="address"
              type="text"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Rua Exemplo, 123"
            />
          </div>

          <div className="form-group">
            <label htmlFor="city">Cidade</label>
            <input
              id="city"
              type="text"
              value={formData.city || ''}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Maricá"
            />
          </div>

          <div className="form-group">
            <label htmlFor="hours">Horário de Funcionamento</label>
            <input
              id="hours"
              type="text"
              value={formData.hours || ''}
              onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              placeholder="Segunda a Sexta, 8h às 17h"
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <span>Serviço ativo (visível no app)</span>
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Salvando...' : service?.id ? 'Atualizar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

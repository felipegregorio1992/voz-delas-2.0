import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import './SupportServiceForm.css';

interface EventFormProps {
  event?: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EventForm({ event, onClose, onSuccess }: EventFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('COURSE');
  const [status, setStatus] = useState('PUBLISHED');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxSlots, setMaxSlots] = useState('');
  const [sector, setSector] = useState('');
  const [program, setProgram] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDescription(event.description || '');
      setCategory(event.category || 'COURSE');
      setStatus(event.status || 'PUBLISHED');
      setLocation(event.location || '');
      setStartDate(event.startDate ? event.startDate.slice(0, 10) : '');
      setEndDate(event.endDate ? event.endDate.slice(0, 10) : '');
      setStartTime(event.startTime || '');
      setEndTime(event.endTime || '');
      setMaxSlots(event.maxSlots ? String(event.maxSlots) : '');
      setSector(event.sector || '');
      setProgram(event.program || '');
      setImagePreview(event.imageUrl || null);
    }
  }, [event]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error('Tipo de imagem não permitido.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem excede 5MB.');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('category', category);
      formData.append('status', status);
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
        await api.patch(`/events/admin/${event.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Evento atualizado!');
      } else {
        await api.post('/events/admin', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Evento criado!');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Erro ao salvar evento';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="support-service-form-overlay" onClick={onClose}>
      <div className="support-service-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <h2>{event?.id ? 'Editar Evento' : 'Novo Evento'}</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="support-service-form">
          <div className="form-group">
            <label htmlFor="ev-title">Título *</label>
            <input id="ev-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ex: Aula de Zumba" />
          </div>

          <div className="form-group">
            <label htmlFor="ev-category">Categoria *</label>
            <select id="ev-category" value={category} onChange={(e) => setCategory(e.target.value)} required>
              <option value="COURSE">Curso</option>
              <option value="WORKSHOP">Oficina</option>
              <option value="PHYSICAL_ACTIVITY">Atividade Física</option>
              <option value="CULTURAL">Cultural</option>
              <option value="HEALTH">Saúde</option>
              <option value="ENTREPRENEURSHIP">Empreendedorismo</option>
              <option value="OTHER">Outro</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="ev-desc">Descrição</label>
            <textarea id="ev-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes do evento..." rows={3}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', resize: 'vertical' }} />
          </div>

          <div className="form-group">
            <label htmlFor="ev-location">Local</label>
            <input id="ev-location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Sede da Secretaria" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="ev-start-date">Data Início *</label>
              <input id="ev-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem' }} />
            </div>
            <div className="form-group">
              <label htmlFor="ev-end-date">Data Fim</label>
              <input id="ev-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="ev-start-time">Horário Início</label>
              <input id="ev-start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem' }} />
            </div>
            <div className="form-group">
              <label htmlFor="ev-end-time">Horário Fim</label>
              <input id="ev-end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem' }} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="ev-slots">Vagas (deixe vazio para ilimitado)</label>
            <input id="ev-slots" type="number" min="1" value={maxSlots} onChange={(e) => setMaxSlots(e.target.value)} placeholder="Ex: 30" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="ev-sector">Setor</label>
              <select id="ev-sector" value={sector} onChange={(e) => setSector(e.target.value)}>
                <option value="">Nenhum</option>
                <option value="SEDE">Sede da Secretaria</option>
                <option value="CASA_DA_MULHER">Casa da Mulher Heloneida Studart</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="ev-program">Programa</label>
              <select id="ev-program" value={program} onChange={(e) => setProgram(e.target.value)}>
                <option value="">Nenhum</option>
                <option value="ELA_EM_MOVIMENTO">Ela em Movimento</option>
                <option value="ELA_NA_CULTURA">Ela na Cultura</option>
                <option value="EMPREENDA_MULHER">Empreenda Mulher</option>
                <option value="CAIMO">CAIMO</option>
                <option value="PROJETO_MUSAS">Projeto Musas</option>
                <option value="SALAO_TIA_ROSA">Salão Tia Rosa</option>
                <option value="CEAM">CEAM</option>
                <option value="REDE_DE_CUIDADO">Rede de Cuidado</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="ev-status">Status</label>
            <select id="ev-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="PUBLISHED">Publicado</option>
              <option value="DRAFT">Rascunho</option>
              <option value="CANCELLED">Cancelado</option>
              <option value="COMPLETED">Concluído</option>
            </select>
          </div>

          <div className="form-group">
            <label>Imagem (opcional)</label>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} style={{ fontSize: '0.9rem' }} />
            {imagePreview && (
              <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '6px', marginTop: '0.5rem', objectFit: 'cover' }} />
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Salvando...' : event?.id ? 'Atualizar' : 'Criar Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import './SupportServiceForm.css';

interface Announcement {
  id?: string;
  title: string;
  content?: string;
  imageUrl?: string;
  type: 'BANNER' | 'NOTICE';
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

interface AnnouncementFormProps {
  announcement?: Announcement | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AnnouncementForm({ announcement, onClose, onSuccess }: AnnouncementFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [type, setType] = useState<'BANNER' | 'NOTICE'>('BANNER');
  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (announcement) {
      setTitle(announcement.title || '');
      setContent(announcement.content || '');
      setLinkUrl((announcement as any).linkUrl || '');
      setType(announcement.type || 'BANNER');
      setIsActive(announcement.isActive !== undefined ? announcement.isActive : true);
      setStartDate(announcement.startDate ? announcement.startDate.slice(0, 16) : '');
      setEndDate(announcement.endDate ? announcement.endDate.slice(0, 16) : '');
      setImagePreview(announcement.imageUrl || null);
    }
  }, [announcement]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error('Tipo de imagem não permitido. Use JPG, PNG, WebP ou GIF.');
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem excede o tamanho máximo de 5MB.');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('type', type);
      formData.append('isActive', String(isActive));

      if (content.trim()) {
        formData.append('content', content.trim());
      }
      if (linkUrl.trim()) {
        formData.append('linkUrl', linkUrl.trim());
      }
      if (startDate) {
        formData.append('startDate', new Date(startDate).toISOString());
      }
      if (endDate) {
        formData.append('endDate', new Date(endDate).toISOString());
      }
      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (announcement?.id) {
        await api.patch(`/announcements/admin/${announcement.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Anúncio atualizado com sucesso!');
      } else {
        await api.post('/announcements/admin', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Anúncio cadastrado com sucesso!');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar anúncio:', error);

      let errorMessage = 'Erro ao salvar anúncio';

      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.message && Array.isArray(errorData.message)) {
          errorMessage = errorData.message.join(', ');
        } else if (errorData.error) {
          errorMessage = typeof errorData.error === 'string' ? errorData.error : errorData.error.message || errorMessage;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
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
          <h2>{announcement?.id ? 'Editar Anúncio' : 'Novo Anúncio'}</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="support-service-form">
          <div className="form-group">
            <label htmlFor="title">Título *</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Ex: Novo recurso disponível"
            />
          </div>

          <div className="form-group">
            <label htmlFor="type">Tipo *</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              required
            >
              <option value="BANNER">Banner (exibido na home)</option>
              <option value="NOTICE">Aviso (popup ao abrir o app)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="content">Conteúdo / Mensagem</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Texto do aviso ou descrição do banner..."
              rows={4}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="linkUrl">Link (opcional - abre ao clicar)</label>
            <input
              id="linkUrl"
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://exemplo.com/pagina"
            />
          </div>

          <div className="form-group">
            <label>Imagem (opcional)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageChange}
                style={{ fontSize: '0.9rem' }}
              />
              {imagePreview && (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '150px',
                      borderRadius: '6px',
                      border: '1px solid #ddd',
                      objectFit: 'cover',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      background: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
              <span style={{ fontSize: '0.8rem', color: '#888' }}>
                Formatos: JPG, PNG, WebP, GIF. Máximo: 5MB
              </span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="startDate">Data de Início (opcional)</label>
            <input
              id="startDate"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="endDate">Data de Fim (opcional)</label>
            <input
              id="endDate"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem' }}
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span>Ativo (visível no app)</span>
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Salvando...' : announcement?.id ? 'Atualizar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

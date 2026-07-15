import { useState, useEffect, useRef, memo } from 'react';
import toast from 'react-hot-toast';
import { connectChat, disconnectChat, getSocket } from '../services/chatService';
import { useAuth } from '../contexts/AuthContext';
import './ChatComponent.css';

interface Message {
  id?: string;
  attendanceId: string;
  senderId: string;
  senderName: string;
  message: string;
  isEncrypted: boolean;
  createdAt: Date;
  recorded: boolean;
}

interface ChatComponentProps {
  attendanceId: string;
}

function ChatComponent({ attendanceId }: ChatComponentProps) {
  const { user } = useAuth();
  const userRef = useRef(user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chatHidden, setChatHidden] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Manter userRef sempre atualizado sem re-disparar o effect de conexão
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!attendanceId) return;

    // Solicitar permissão para notificações
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
          .then((permission) => setNotificationPermission(permission))
          .catch(console.error);
      } else {
        setNotificationPermission(Notification.permission);
      }
    }

    // FIX #2: Adicionar method: 'POST' — o endpoint é @Post('ws-token')
    // Sem isso, o fetch usa GET por padrão e recebe 404, impedindo a conexão do chat
    const fetchTokenAndConnect = async () => {
      try {
        const response = await fetch('/api/v1/auth/ws-token', {
          method: 'POST',
          credentials: 'include', // envia o cookie HttpOnly automaticamente
        });
        if (!response.ok) return;
        const data = await response.json();
        const token = data?.data?.token;
        if (!token) return;

        // FIX #2: connectChat usa apenas WebSocket (sem polling) — token não vai na URL
        const socket = connectChat(attendanceId, token);
        socketRef.current = socket;

        const loadHistory = () => {
          socket.emit('get-messages', (res: any) => {
            if (res?.messages) {
              const formatted = res.messages.map((msg: any) => ({
                id: msg.id,
                attendanceId: msg.attendanceId,
                senderId: msg.senderId,
                senderName: msg.senderName || msg.sender?.name || 'Usuário',
                message: msg.message,
                isEncrypted: msg.isEncrypted,
                createdAt: new Date(msg.createdAt),
                recorded: msg.recorded ?? true,
              }));
              setMessages(formatted);
              scrollToBottom();
            }
          });
        };

        socket.on('connect', () => {
          setIsConnected(true);
        });

        // 'chat-ready' é emitido pelo servidor após handleConnection terminar,
        // garantindo que activeConnections já tem o cliente registrado
        socket.on('chat-ready', (data: { attendanceId: string; chatHidden: boolean }) => {
          setChatHidden(data.chatHidden ?? false);
          loadHistory();
        });

        socket.on('disconnect', () => {
          setIsConnected(false);
        });

        socket.on('new-message', (messageData: Message) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id && m.id === messageData.id)) return prev;
            return [...prev, messageData];
          });
          scrollToBottom();

          const currentUser = userRef.current;
          const isOwnMessage = messageData.senderId === currentUser?.id;
          if (!isOwnMessage && Notification.permission === 'granted') {
            showNotification(messageData);
          }
        });

        socket.on('user-connected', (_data: any) => {});
        socket.on('user-disconnected', (_data: any) => {});

        socket.on('attendance-ended', (_data: any) => {
          toast.error('O atendimento foi encerrado pela usuária.');
        });

        socket.on('chat-visibility-changed', (data: { hidden: boolean }) => {
          setChatHidden(data.hidden);
        });
      } catch (err) {
        console.error('Erro ao conectar ao chat:', err);
      }
    };

    fetchTokenAndConnect();

    return () => {
      disconnectChat();
    };
  }, [attendanceId]); // Apenas attendanceId — user é lido via ref

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isConnected) return;

    const socket = getSocket();
    if (!socket) return;

    setLoading(true);
    try {
      socket.emit(
        'send-message',
        { message: newMessage.trim(), isEncrypted: true },
        (response: any) => {
          if (response?.success) {
            setNewMessage('');
          } else {
            toast.error('Erro ao enviar mensagem: ' + (response?.error || 'Erro desconhecido'));
          }
          setLoading(false);
        },
      );
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setLoading(false);
    }
  };

  const handleEndAttendance = () => {
    if (!window.confirm('Tem certeza que deseja encerrar o atendimento?')) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit('end-attendance', (response: any) => {
      if (response?.success) {
        toast.success('Atendimento encerrado com sucesso.');
      } else {
        toast.error('Erro ao encerrar atendimento: ' + (response?.error || 'Erro desconhecido'));
      }
    });
  };

  const handleToggleChatVisibility = () => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('toggle-chat-visibility', { hidden: !chatHidden });
  };

  const showNotification = (message: Message) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      const bodyText = `${message.senderName}: ${message.message.substring(0, 50)}${
        message.message.length > 50 ? '...' : ''
      }`;
      const notification = new Notification('💜 Nova Mensagem - Sala Lilás', {
        body: bodyText,
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: `chat-${attendanceId}`,
        requireInteraction: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      setTimeout(() => notification.close(), 5000);
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
    }
  };

  return (
    <div className="chat-component">
      <div className="chat-header-internal">
        <div className="chat-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot" />
          </span>
          {notificationPermission === 'default' && 'Notification' in window && (
            <button
              onClick={() => {
                Notification.requestPermission().then((permission) => {
                  setNotificationPermission(permission);
                  if (permission === 'granted') {
                    toast.success('Notificações ativadas!');
                  }
                });
              }}
              className="notification-permission-btn"
              title="Ativar notificações"
            >
              🔔
            </button>
          )}
          <button
            onClick={handleToggleChatVisibility}
            className={`hide-chat-btn ${chatHidden ? 'chat-hidden-active' : ''}`}
            title={chatHidden ? 'Liberar chat no celular' : 'Ocultar chat no celular'}
            disabled={!isConnected}
          >
            {chatHidden ? '🔓 Liberar chat' : 'Ocultar no celular'}
          </button>
        </div>
        {chatHidden && (
          <div className="chat-hidden-banner">⚠️ Chat oculto no celular da usuária</div>
        )}
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p>Nenhuma mensagem ainda.</p>
            <p className="hint">
              As mensagens são criptografadas e registradas apenas com seu consentimento.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwnMessage = msg.senderId === user?.id;
            return (
              <div
                key={msg.id || index}
                className={`message ${isOwnMessage ? 'own-message' : 'other-message'}`}
              >
                <div className="message-header">
                  <span className="message-sender">{msg.senderName}</span>
                  <span className="message-time">
                    {new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="message-content">{msg.message}</div>
                {msg.recorded && (
                  <div className="message-status">
                    <span className="recorded-badge">✓ Registrado</span>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={isConnected ? 'Digite sua mensagem...' : 'Conectando...'}
          disabled={!isConnected || loading}
          className="chat-input"
        />
        <button
          type="submit"
          disabled={!isConnected || !newMessage.trim() || loading}
          className="chat-send-button"
        >
          {loading ? '⏳' : '📤'}
        </button>
      </form>

      {!user?.permissions?.includes('SALA_LILAS_ACCESS') && (
        <div className="chat-footer">
          <button onClick={handleEndAttendance} className="btn-end-attendance">
            Encerrar Atendimento
          </button>
        </div>
      )}
    </div>
  );
}

// Usar React.memo para evitar re-renderizações quando attendanceId não mudar
export default memo(ChatComponent, (prevProps, nextProps) => {
  // Só re-renderizar se attendanceId mudar
  return prevProps.attendanceId === nextProps.attendanceId;
});

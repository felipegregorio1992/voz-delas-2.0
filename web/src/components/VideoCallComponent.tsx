import { useState, useEffect, useRef, memo } from 'react';
import { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { connectVideoCall, disconnectVideoCall, getVideoCallSocket } from '../services/videoCallService';
import { api } from '../services/api';
import './VideoCallComponent.css';

interface VideoCallComponentProps {
  attendanceId: string;
  onEndCall?: () => void;
}

type CallStatus = 'idle' | 'connecting' | 'connected' | 'ended' | 'error';

function VideoCallComponent({ attendanceId, onEndCall }: VideoCallComponentProps) {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);
  const [_remoteAudioEnabled, setRemoteAudioEnabled] = useState(true);
  const [_hasPermission, _setHasPermission] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const callStatusRef = useRef<CallStatus>('idle');

  // Manter ref sincronizada com o estado para evitar stale closures nos event handlers
  const setCallStatusSafe = (status: CallStatus) => {
    callStatusRef.current = status;
    setCallStatus(status);
  };
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const sessionStartTimeRef = useRef<Date | null>(null);
  const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (socketRef.current) {
      disconnectVideoCall();
      socketRef.current = null;
    }
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
      timeIntervalRef.current = null;
    }
  };

  const initializeWebRTC = async () => {
    try {
      setCallStatus('connecting');

      // FIX: Solicitar stream diretamente — sem requestPermissions() separado que
      // causava dupla solicitação de permissão ao browser.
      let localStream: MediaStream;

      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      } catch (videoError: any) {
        if (
          videoError.name === 'NotFoundError' ||
          videoError.name === 'DevicesNotFoundError'
        ) {
          setLocalVideoEnabled(false);
          localStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
          });
        } else if (
          videoError.name === 'NotAllowedError' ||
          videoError.name === 'PermissionDeniedError'
        ) {
          setPermissionError(
            'Permissão negada. Permita o acesso ao microfone nas configurações do navegador.',
          );
          setCallStatus('error');
          return;
        } else {
          throw videoError;
        }
      }

      localStreamRef.current = localStream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      // Criar ou obter sessão de vídeo
      let videoSession;
      try {
        const sessionRes = await api.get(`/sala-lilas/attendances/${attendanceId}/video-session`);
        videoSession = sessionRes.data?.data || sessionRes.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          // Criar nova sessão
          const createRes = await api.post(`/sala-lilas/attendances/${attendanceId}/video-session`, {});
          videoSession = createRes.data?.data || createRes.data;
        } else {
          throw error;
        }
      }

      // Iniciar sessão
      if (videoSession?.id && videoSession.status === 'PENDING') {
        await api.post(`/sala-lilas/video-sessions/${videoSession.id}/start`, {});
      }

      // FIX #3: Buscar token via /auth/ws-token (cookie HttpOnly) em vez de localStorage.
      // localStorage.getItem('accessToken') sempre retorna null após a migração para cookies.
      const tokenRes = await fetch('/api/v1/auth/ws-token', {
        method: 'POST',
        credentials: 'include',
      });
      if (!tokenRes.ok) {
        throw new Error('Não foi possível obter token para videochamada');
      }
      const tokenData = await tokenRes.json();
      const token = tokenData?.data?.token;
      if (!token) {
        throw new Error('Token de videochamada não retornado pelo servidor');
      }

      const socket = connectVideoCall(attendanceId, token);
      socketRef.current = socket;

      // Configurar WebRTC
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      };

      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Adicionar stream local ao peer connection
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });

      // Event listeners para WebRTC
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', {
            attendanceId,
            candidate: event.candidate,
          });
        }
      };

      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Event listeners para WebSocket
      socket.on('connect', () => {
        // conectado
      });

      socket.on('room-info', async (data: any) => {
        if (data.expiresAt) {
          const expiresAt = new Date(data.expiresAt);
          sessionStartTimeRef.current = new Date();
          startTimeCounter(expiresAt);
        }

        // FIX #10: Se já houver participantes na sala, enviar offer imediatamente.
        // Sem isso, conexões simultâneas nunca iniciam a negociação WebRTC.
        if (data.participants && data.participants.length > 0) {
          if (peerConnectionRef.current) {
            try {
              const offer = await peerConnectionRef.current.createOffer();
              await peerConnectionRef.current.setLocalDescription(offer);
              socket.emit('offer', { attendanceId, offer });
            } catch (err) {
              // erro ao criar offer — não fatal
            }
          }
        }
      });

      socket.on('user-joined', (_data: any) => {
        setCallStatusSafe('connected');
      });

      socket.on('user-left', (_data: any) => {
        // FIX #9: Usar ref em vez de state para evitar stale closure.
        // callStatus capturado no closure seria sempre 'idle' (valor inicial).
        if (callStatusRef.current === 'connected' || callStatusRef.current === 'connecting') {
          endCall();
        }
      });

      socket.on('offer', async (data: any) => {
        if (peerConnection && data.offer) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          socket.emit('answer', { attendanceId, answer });
        }
      });

      socket.on('answer', async (data: any) => {
        if (peerConnection && data.answer) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      });

      socket.on('ice-candidate', async (data: any) => {
        if (peerConnection && data.candidate) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      });

      socket.on('media-toggled', (data: any) => {
        if (data.type === 'video') {
          setRemoteVideoEnabled(data.enabled);
        } else if (data.type === 'audio') {
          setRemoteAudioEnabled(data.enabled);
        }
      });

      socket.on('call-ended', (_data: any) => {
        endCall();
      });

      socket.on('room-expired', (_data: any) => {
        toast.error('A sessão de vídeo expirou (máximo 60 minutos).');
        endCall();
      });

      socket.on('error', (_error: any) => {
        setCallStatusSafe('error');
      });

      setCallStatusSafe('connected');
    } catch (error: any) {
      setPermissionError(error?.message || 'Erro ao iniciar videochamada.');
      setCallStatusSafe('error');
      cleanup();
    }
  };

  const startTimeCounter = (expiresAt: Date) => {
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
    }

    timeIntervalRef.current = setInterval(() => {
      const now = new Date();
      const remaining = expiresAt.getTime() - now.getTime();
      
      if (remaining <= 0) {
        setTimeRemaining(0);
        if (timeIntervalRef.current) {
          clearInterval(timeIntervalRef.current);
        }
        return;
      }

      setTimeRemaining(remaining);
    }, 1000);
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !localVideoEnabled;
        setLocalVideoEnabled(!localVideoEnabled);
        
        const socket = getVideoCallSocket();
        if (socket) {
          socket.emit('toggle-media', {
            attendanceId,
            type: 'video',
            enabled: !localVideoEnabled,
          });
        }
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !localAudioEnabled;
        setLocalAudioEnabled(!localAudioEnabled);
        
        const socket = getVideoCallSocket();
        if (socket) {
          socket.emit('toggle-media', {
            attendanceId,
            type: 'audio',
            enabled: !localAudioEnabled,
          });
        }
      }
    }
  };

  const endCall = async () => {
    try {
      const socket = getVideoCallSocket();
      if (socket) {
        socket.emit('end-call', { attendanceId });
      }

      // Buscar sessão e encerrar
      try {
        const sessionRes = await api.get(`/sala-lilas/attendances/${attendanceId}/video-session`);
        const session = sessionRes.data?.data || sessionRes.data;
        if (session?.id) {
          await api.post(`/sala-lilas/video-sessions/${session.id}/end`, {});
        }
      } catch (error) {
        console.error('Erro ao encerrar sessão:', error);
      }
    } catch (error) {
      console.error('Erro ao encerrar chamada:', error);
    } finally {
      setCallStatus('ended');
      cleanup();
      if (onEndCall) {
        onEndCall();
      }
    }
  };

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (callStatus === 'idle') {
    return (
      <div className="video-call-container">
        <div className="video-call-permission-screen">
          <h2>🎥 Videoatendimento</h2>
          <p>Para iniciar a chamada, precisamos de acesso ao seu microfone. A câmera é opcional.</p>
          <p className="privacy-notice">
            🔒 <strong>Privacidade:</strong> Suas imagens e áudio não são gravados ou armazenados.
            A comunicação é criptografada e segura.
          </p>
          
          {/* Instruções de como permitir permissões */}
          <div className="permission-instructions">
            <h3>Como permitir acesso:</h3>
            <ul>
              <li>Clique no botão abaixo para solicitar permissões</li>
              <li>Quando aparecer o pop-up do navegador, clique em <strong>"Permitir"</strong> para o microfone</li>
              <li><strong>Câmera é opcional:</strong> Você pode usar apenas áudio se não tiver câmera ou preferir</li>
              <li>Se não aparecer o pop-up, verifique o ícone de bloqueio 🔒 na barra de endereços</li>
              <li>Certifique-se de que nenhum outro aplicativo está usando o microfone</li>
            </ul>
          </div>

          {permissionError && (
            <div className="permission-error">
              <p><strong>⚠️ Erro:</strong> {permissionError}</p>
              <p className="permission-help">
                💡 <strong>Dica:</strong> Se você negou a permissão antes, 
                clique no ícone de bloqueio 🔒 na barra de endereços e permita o acesso à câmera e microfone.
              </p>
            </div>
          )}
          
          <button 
            className="btn-start-call"
            onClick={initializeWebRTC}
            disabled={false}
          >
            Iniciar Videochamada
          </button>
        </div>
      </div>
    );
  }

  if (callStatus === 'error') {
    return (
      <div className="video-call-container">
        <div className="video-call-error">
          <h2>❌ Erro na Videochamada</h2>
          <p>{permissionError || 'Ocorreu um erro ao iniciar a videochamada.'}</p>
          <button className="btn-start-call" onClick={() => {
            setCallStatus('idle');
            setPermissionError(null);
          }}>
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (callStatus === 'ended') {
    return (
      <div className="video-call-container">
        <div className="video-call-ended">
          <h2>Chamada Encerrada</h2>
          <p>A videochamada foi encerrada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="video-call-container">
      <div className="video-call-header">
        <div className="call-status">
          {callStatus === 'connecting' && <span>🔄 Conectando...</span>}
          {callStatus === 'connected' && <span>✅ Conectado</span>}
        </div>
        {timeRemaining !== null && (
          <div className="call-timer">
            ⏱️ Tempo restante: {formatTime(timeRemaining)}
          </div>
        )}
      </div>

      <div className="video-call-videos">
        <div className="remote-video-container">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="remote-video"
            style={{ display: remoteVideoEnabled ? 'block' : 'none' }}
          />
          {!remoteVideoEnabled && (
            <div className="video-placeholder">
              <span>📹 Vídeo desativado</span>
            </div>
          )}
        </div>

        <div className="local-video-container">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="local-video"
            style={{ display: localVideoEnabled ? 'block' : 'none' }}
          />
          {!localVideoEnabled && (
            <div className="video-placeholder small">
              <span>📹</span>
            </div>
          )}
        </div>
      </div>

      <div className="video-call-controls">
        <button
          className={`control-btn ${localVideoEnabled ? 'active' : 'inactive'}`}
          onClick={toggleVideo}
          title={localVideoEnabled ? 'Desativar câmera' : 'Ativar câmera'}
        >
          {localVideoEnabled ? '📹' : '📹🚫'}
        </button>
        <button
          className={`control-btn ${localAudioEnabled ? 'active' : 'inactive'}`}
          onClick={toggleAudio}
          title={localAudioEnabled ? 'Desativar microfone' : 'Ativar microfone'}
        >
          {localAudioEnabled ? '🎤' : '🎤🚫'}
        </button>
        <button
          className="control-btn end-call"
          onClick={endCall}
          title="Encerrar chamada"
        >
          📞 Encerrar
        </button>
      </div>
    </div>
  );
}

// Usar React.memo para evitar re-renderizações quando attendanceId não mudar
export default memo(VideoCallComponent, (prevProps, nextProps) => {
  // Só re-renderizar se attendanceId ou onEndCall mudarem
  return prevProps.attendanceId === nextProps.attendanceId && 
         prevProps.onEndCall === nextProps.onEndCall;
});

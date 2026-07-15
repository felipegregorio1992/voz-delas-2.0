import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/storage/storage_service.dart';
import '../../../core/config/api_config.dart';

class VideoCallService {
  IO.Socket? _socket;
  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;
  final StorageService _storage;
  
  // Callbacks para a UI
  Function(MediaStream)? onRemoteStream;
  Function(String)? onError;
  Function()? onConnected;
  Function()? onDisconnected;
  Function(String)? onStatusChange; // Novo: para debug na UI

  VideoCallService(this._storage);

  // --- Conexão e Inicialização ---

  Future<void> connect(String attendanceId) async {
    try {
      _log('Iniciando conexão para sala: $attendanceId');
      
      final token = await _storage.getAccessToken();
      if (token == null) throw Exception('Token não encontrado');

      // 1. Inicializar WebRTC (Câmera/Microfone)
      await _initLocalStream();

      // 2. Inicializar PeerConnection
      await _initPeerConnection(attendanceId);

      // 3. Conectar Socket
      _connectSocket(token, attendanceId);

    } catch (e) {
      _log('Erro fatal ao conectar: $e');
      onError?.call(e.toString());
      disconnect(); // Limpa tudo se falhar
    }
  }

  Future<void> _initLocalStream() async {
    _log('Obtendo acesso à câmera e microfone...');
    final constraints = {
      'audio': true,
      'video': {
        'facingMode': 'user',
        'width': {'ideal': 640}, // Reduzido para garantir performance
        'height': {'ideal': 480},
      }
    };

    try {
      _localStream = await navigator.mediaDevices.getUserMedia(constraints);
      _log('Stream local obtido com sucesso');
    } catch (e) {
      _log('Erro ao obter media: $e');
      throw Exception('Não foi possível acessar câmera/microfone');
    }
  }

  Future<void> _initPeerConnection(String attendanceId) async {
    _log('Criando PeerConnection...');
    
    final config = {
      'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'},
        {'urls': 'stun:stun1.l.google.com:19302'},
      ]
    };

    _peerConnection = await createPeerConnection(config);

    // Adicionar stream local
    _localStream?.getTracks().forEach((track) {
      _peerConnection?.addTrack(track, _localStream!);
    });

    // Callbacks do PeerConnection
    _peerConnection!.onIceCandidate = (candidate) {
      if (_socket?.connected == true) {
        _log('Enviando ICE Candidate');
        _socket!.emit('ice-candidate', {
          'attendanceId': attendanceId,
          'candidate': {
            'candidate': candidate.candidate,
            'sdpMid': candidate.sdpMid,
            'sdpMLineIndex': candidate.sdpMLineIndex,
          }
        });
      }
    };

    _peerConnection!.onTrack = (event) {
      _log('Track remoto recebido!');
      if (event.streams.isNotEmpty) {
        onRemoteStream?.call(event.streams[0]);
      }
    };
  }

  void _connectSocket(String token, String attendanceId) {
    final wsUrl = ApiConfig.baseUrlWithoutApi;
    _log('Conectando ao Socket.IO: $wsUrl/sala-lilas-video');

    _socket = IO.io(
      '$wsUrl/sala-lilas-video',
      IO.OptionBuilder()
          .setTransports(['websocket']) // Forçar websocket para estabilidade
          .setAuth({'token': token})
          .setQuery({'attendanceId': attendanceId})
          .enableForceNew() // Importante para garantir nova conexão
          .build(),
    );

    _socket!.onConnect((_) {
      _log('Socket conectado!');
      onConnected?.call();
    });

    _socket!.onDisconnect((_) {
      _log('Socket desconectado');
      onDisconnected?.call();
    });

    _socket!.on('error', (data) {
      final msg = data is Map ? data['message'] : data.toString();
      _log('Erro do Socket: $msg');
      onError?.call(msg);
    });

    // --- Sinalização ---

    _socket!.on('room-info', (data) async {
      _log('Info da sala recebida: $data');
      final participants = data['participants'] as List;
      
      // Se já tem gente na sala, eu inicio a oferta (Offerer)
      if (participants.isNotEmpty) {
        _log('Já existe alguém na sala. Iniciando oferta...');
        await _createOffer(attendanceId);
      } else {
        _log('Sou o primeiro na sala. Aguardando conexão...');
      }
    });

    _socket!.on('user-joined', (data) async {
      _log('Novo usuário entrou: ${data['name']}');
      // Se eu já estava aqui, o novo usuário vai mandar Offer. Eu aguardo.
      // Mas por segurança, se ambos tentarem, o WebRTC resolve (glare handling básico).
      // Pela nossa lógica do room-info, o novo usuário SEMPRE manda offer.
    });

    _socket!.on('offer', (data) async {
      _log('Recebi Offer de ${data['from']}');
      await _handleOffer(data['offer'], attendanceId);
    });

    _socket!.on('answer', (data) async {
      _log('Recebi Answer de ${data['from']}');
      await _handleAnswer(data['answer']);
    });

    _socket!.on('ice-candidate', (data) async {
      _log('Recebi ICE Candidate');
      await _handleIceCandidate(data['candidate']);
    });
  }

  // --- Handlers de Sinalização ---

  Future<void> _createOffer(String attendanceId) async {
    try {
      final offer = await _peerConnection!.createOffer();
      await _peerConnection!.setLocalDescription(offer);

      _socket!.emit('offer', {
        'attendanceId': attendanceId,
        'offer': {'sdp': offer.sdp, 'type': offer.type},
      });
    } catch (e) {
      _log('Erro ao criar oferta: $e');
    }
  }

  Future<void> _handleOffer(Map<String, dynamic> offerData, String attendanceId) async {
    try {
      final offer = RTCSessionDescription(offerData['sdp'], offerData['type']);
      await _peerConnection!.setRemoteDescription(offer);

      final answer = await _peerConnection!.createAnswer();
      await _peerConnection!.setLocalDescription(answer);

      _socket!.emit('answer', {
        'attendanceId': attendanceId,
        'answer': {'sdp': answer.sdp, 'type': answer.type},
      });
    } catch (e) {
      _log('Erro ao processar oferta: $e');
    }
  }

  Future<void> _handleAnswer(Map<String, dynamic> answerData) async {
    try {
      final answer = RTCSessionDescription(answerData['sdp'], answerData['type']);
      await _peerConnection!.setRemoteDescription(answer);
    } catch (e) {
      _log('Erro ao processar resposta: $e');
    }
  }

  Future<void> _handleIceCandidate(Map<String, dynamic> candidateData) async {
    try {
      final candidate = RTCIceCandidate(
        candidateData['candidate'],
        candidateData['sdpMid'],
        candidateData['sdpMLineIndex'],
      );
      await _peerConnection!.addCandidate(candidate);
    } catch (e) {
      _log('Erro ao adicionar ICE Candidate: $e');
    }
  }

  // --- Controles de Mídia ---

  void toggleAudio() {
    if (_localStream != null) {
      final track = _localStream!.getAudioTracks().first;
      track.enabled = !track.enabled;
    }
  }

  void toggleVideo() {
    if (_localStream != null) {
      final track = _localStream!.getVideoTracks().first;
      track.enabled = !track.enabled;
    }
  }

  Future<void> switchCamera() async {
    if (_localStream != null) {
      final track = _localStream!.getVideoTracks().first;
      await Helper.switchCamera(track);
    }
  }

  bool get isAudioEnabled => _localStream?.getAudioTracks().first.enabled ?? false;
  bool get isVideoEnabled => _localStream?.getVideoTracks().first.enabled ?? false;

  MediaStream? get localStream => _localStream;

  // --- Cleanup ---

  void disconnect() {
    _log('Desconectando...');
    
    _localStream?.getTracks().forEach((track) => track.stop());
    _localStream?.dispose();
    _localStream = null;

    _peerConnection?.close();
    _peerConnection = null;

    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    
    _log('Desconectado e limpo.');
  }

  void _log(String message) {
    print('[VideoService] $message');
    onStatusChange?.call(message);
  }
}

final videoCallServiceProvider = Provider.autoDispose<VideoCallService>((ref) {
  final storage = ref.watch(storageServiceProvider);
  final service = VideoCallService(storage);
  ref.onDispose(() {
    service.disconnect();
  });
  return service;
});

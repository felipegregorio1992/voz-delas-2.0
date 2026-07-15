import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:permission_handler/permission_handler.dart';
import '../services/video_call_service.dart';

class VideoCallPage extends ConsumerStatefulWidget {
  final String attendanceId;

  const VideoCallPage({
    super.key,
    required this.attendanceId,
  });

  @override
  ConsumerState<VideoCallPage> createState() => _VideoCallPageState();
}

class _VideoCallPageState extends ConsumerState<VideoCallPage> {
  final _localRenderer = RTCVideoRenderer();
  final _remoteRenderer = RTCVideoRenderer();
  
  bool _isMicOn = true;
  bool _isCameraOn = true;
  String _statusMessage = 'Inicializando...';
  bool _isInCall = false; // Se conectado e com stream remoto
  
  @override
  void initState() {
    super.initState();
    _initCall();
  }

  @override
  void dispose() {
    _localRenderer.dispose();
    _remoteRenderer.dispose();
    super.dispose();
  }

  Future<void> _initCall() async {
    await _localRenderer.initialize();
    await _remoteRenderer.initialize();

    await _checkPermissions();
    
    // Iniciar conexão
    final service = ref.read(videoCallServiceProvider);
    
    // Configurar callbacks
    service.onStatusChange = (msg) {
      if (mounted) setState(() => _statusMessage = msg);
    };

    service.onError = (err) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro: $err'), backgroundColor: Colors.red),
        );
        setState(() => _statusMessage = 'Erro: $err');
      }
    };

    service.onConnected = () {
      if (mounted) {
        setState(() => _statusMessage = 'Conectado. Aguardando vídeo...');
        // Assim que conectar, já podemos mostrar o vídeo local
        if (service.localStream != null) {
          _localRenderer.srcObject = service.localStream;
        }
      }
    };

    service.onRemoteStream = (stream) {
      if (mounted) {
        setState(() {
          _remoteRenderer.srcObject = stream;
          _isInCall = true;
          _statusMessage = 'Chamada em andamento';
        });
      }
    };

    service.onDisconnected = () {
      if (mounted) {
        setState(() {
          _isInCall = false;
          _statusMessage = 'Chamada encerrada';
        });
        // Opcional: fechar a tela automaticamente após um tempo
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) context.pop();
        });
      }
    };

    // Conectar efetivamente
    await service.connect(widget.attendanceId);
  }

  Future<void> _checkPermissions() async {
    await [Permission.camera, Permission.microphone].request();
  }

  void _toggleMic() {
    final service = ref.read(videoCallServiceProvider);
    service.toggleAudio();
    setState(() => _isMicOn = !_isMicOn);
  }

  void _toggleCamera() {
    final service = ref.read(videoCallServiceProvider);
    service.toggleVideo();
    setState(() => _isCameraOn = !_isCameraOn);
  }

  void _switchCamera() {
    final service = ref.read(videoCallServiceProvider);
    service.switchCamera();
  }

  void _endCall() {
    // O autoDispose do provider cuidará da desconexão
    context.pop(); 
  }

  @override
  Widget build(BuildContext context) {
    // Manter o provider vivo
    ref.watch(videoCallServiceProvider);

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // 1. Vídeo Remoto (Fundo)
          Positioned.fill(
            child: _isInCall 
                ? RTCVideoView(
                    _remoteRenderer,
                    objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                  )
                : Container(
                    color: Colors.grey[900],
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const CircularProgressIndicator(color: Colors.white),
                          const SizedBox(height: 20),
                          Text(
                            _statusMessage,
                            style: const TextStyle(color: Colors.white70),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  ),
          ),

          // 2. Vídeo Local (PIP)
          Positioned(
            right: 20,
            top: 50,
            width: 100,
            height: 150,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Container(
                color: Colors.black54,
                child: RTCVideoView(
                  _localRenderer,
                  mirror: true,
                  objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                ),
              ),
            ),
          ),

          // 3. Controles (Base)
          Positioned(
            bottom: 30,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildButton(
                    icon: _isMicOn ? Icons.mic : Icons.mic_off,
                    color: _isMicOn ? Colors.white : Colors.black,
                    bgColor: _isMicOn ? Colors.white24 : Colors.white,
                    onTap: _toggleMic,
                  ),
                  _buildButton(
                    icon: Icons.call_end,
                    color: Colors.white,
                    bgColor: Colors.red,
                    size: 64,
                    onTap: _endCall,
                  ),
                  _buildButton(
                    icon: _isCameraOn ? Icons.videocam : Icons.videocam_off,
                    color: _isCameraOn ? Colors.white : Colors.black,
                    bgColor: _isCameraOn ? Colors.white24 : Colors.white,
                    onTap: _toggleCamera,
                  ),
                  _buildButton(
                    icon: Icons.cameraswitch,
                    color: Colors.white,
                    bgColor: Colors.white24,
                    onTap: _switchCamera,
                  ),
                ],
              ),
            ),
          ),
          
          // 4. Botão Voltar (Topo Esquerda)
          Positioned(
            top: 40,
            left: 10,
            child: SafeArea(
              child: IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white),
                onPressed: _endCall,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildButton({
    required IconData icon,
    required Color color,
    required Color bgColor,
    required VoidCallback onTap,
    double size = 48,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: bgColor,
        ),
        child: Icon(icon, color: color, size: size * 0.5),
      ),
    );
  }
}

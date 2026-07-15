import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/storage/storage_service.dart';
import '../../../core/config/api_config.dart';

class ChatService {
  IO.Socket? _socket;
  final StorageService _storage;

  ChatService(this._storage);

  Function(Map<String, dynamic>)? _onVideoCallStarted;
  Function(bool)? _onChatVisibilityChanged;
  Function(bool)? _onChatReady;

  Future<void> connect(
    String attendanceId,
    Function(Map<String, dynamic>) onMessage, {
    Function(Map<String, dynamic>)? onVideoCallStarted,
    Function(bool)? onChatVisibilityChanged,
    Function(bool)? onChatReady,
  }) async {
    _onVideoCallStarted = onVideoCallStarted;
    _onChatVisibilityChanged = onChatVisibilityChanged;
    _onChatReady = onChatReady;
    final token = await _storage.getAccessToken();
    if (token == null || token.isEmpty) {
      throw Exception('Token não encontrado');
    }

    // Desconectar se já houver conexão
    if (_socket != null) {
      _socket!.disconnect();
      _socket!.dispose();
    }

    // URL do WebSocket - usar mesma configuração da API
    final wsUrl = ApiConfig.baseUrlWithoutApi;

    _socket = IO.io(
      '$wsUrl/sala-lilas-chat',
      IO.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .setAuth({'token': token})
          .setQuery({'attendanceId': attendanceId})
          .enableAutoConnect()
          .build(),
    );

    _socket!.onConnect((_) {
      print('✅ Conectado ao chat');
      // Notificar que está conectado
    });

    _socket!.onDisconnect((_) {
      print('❌ Desconectado do chat');
    });

    _socket!.onConnectError((error) {
      print('❌ Erro ao conectar: $error');
    });

    _socket!.onError((error) {
      print('❌ Erro no socket: $error');
    });

    _socket!.on('new-message', (data) {
      print('📨 Nova mensagem recebida: $data');
      if (data is Map<String, dynamic>) {
        onMessage(data);
      }
    });

    _socket!.on('user-connected', (data) {
      print('👤 Usuário conectado: $data');
    });

    _socket!.on('user-disconnected', (data) {
      print('👤 Usuário desconectado: $data');
    });

    _socket!.on('attendance-ended', (data) {
      print('🔚 Atendimento encerrado: $data');
    });

    _socket!.on('video-call-started', (data) {
      print('🎥 Videochamada iniciada: $data');
      if (data is Map<String, dynamic> && _onVideoCallStarted != null) {
        _onVideoCallStarted!(data);
      }
    });

    _socket!.on('chat-visibility-changed', (data) {
      print('👁️ Visibilidade do chat alterada: $data');
      if (data is Map<String, dynamic> && _onChatVisibilityChanged != null) {
        final hidden = data['hidden'] == true;
        _onChatVisibilityChanged!(hidden);
      }
    });

    _socket!.on('chat-ready', (data) {
      print('🟢 Chat pronto: $data');
      if (_onChatReady != null) {
        final hidden = (data is Map<String, dynamic>) ? data['chatHidden'] == true : false;
        _onChatReady!(hidden);
      }
    });

    _socket!.connect();
  }

  Future<bool> sendMessage(String message, {bool isEncrypted = true}) async {
    if (_socket == null || !_socket!.connected) {
      throw Exception('Socket não conectado');
    }

    final completer = Completer<bool>();

    _socket!.emitWithAck('send-message', {
      'message': message,
      'isEncrypted': isEncrypted,
    }, ack: (response) {
      if (response is Map) {
        final success = response['success'] == true;
        completer.complete(success);
        if (!success) {
          print('❌ Erro ao enviar mensagem: ${response['error']}');
        }
      } else {
        completer.complete(false);
      }
    });

    return completer.future.timeout(
      const Duration(seconds: 5),
      onTimeout: () {
        print('⏱️ Timeout ao enviar mensagem');
        return false;
      },
    );
  }

  Future<List<Map<String, dynamic>>> getMessages() async {
    if (_socket == null || !_socket!.connected) {
      return [];
    }

    final completer = Completer<List<Map<String, dynamic>>>();
    
    _socket!.emitWithAck('get-messages', null, ack: (response) {
      if (response is Map && response['messages'] != null) {
        final messages = (response['messages'] as List)
            .map((m) => m as Map<String, dynamic>)
            .toList();
        completer.complete(messages);
      } else {
        completer.complete([]);
      }
    });

    return completer.future.timeout(
      const Duration(seconds: 5),
      onTimeout: () => [],
    );
  }

  void endAttendance() {
    if (_socket == null || !_socket!.connected) {
      throw Exception('Socket não conectado');
    }

    _socket!.emit('end-attendance');
  }

  /// Oculta o chat no mobile — só pode ocultar, não reexibir
  void hideChatOnMobile() {
    if (_socket == null || !_socket!.connected) return;
    _socket!.emit('toggle-chat-visibility', {'hidden': true});
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }

  bool get isConnected => _socket?.connected ?? false;
}

final chatServiceProvider = Provider<ChatService>((ref) {
  final storage = ref.watch(storageServiceProvider);
  return ChatService(storage);
});

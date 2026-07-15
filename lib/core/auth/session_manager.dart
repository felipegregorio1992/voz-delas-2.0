import 'dart:async';
import 'package:flutter/foundation.dart' show kDebugMode;

/// Gerenciador global de sessão.
/// Quando o refresh token falha, notifica os listeners para redirecionar ao login.
class SessionManager {
  SessionManager._();
  static final instance = SessionManager._();

  final _expiredController = StreamController<void>.broadcast();

  /// Stream que emite quando a sessão expira (refresh falhou).
  Stream<void> get onSessionExpired => _expiredController.stream;

  /// Chamado pelo DioClient quando o refresh token falha.
  void notifySessionExpired() {
    if (kDebugMode) {
      // ignore: avoid_print
      print('🔒 Sessão expirada — redirecionando para login');
    }
    _expiredController.add(null);
  }
}

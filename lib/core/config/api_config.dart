import 'dart:io';
import 'package:flutter/foundation.dart';

class ApiConfig {
  // ─── URLs por ambiente ────────────────────────────────────────────────────────

  // Emulador Android: 10.0.2.2 aponta para o localhost do host
  static const String _emulatorUrl = 'http://10.0.2.2:3000/api/v1';

  // Dispositivo físico Android/iOS: IP da máquina na rede local
  // Execute `ipconfig` (Windows) ou `ifconfig` (Mac/Linux) para descobrir
  static const String _physicalDeviceUrl = 'http://192.168.1.109:3000/api/v1';

  // Flutter Web rodando via `flutter run -d chrome`:
  // Usa o proxy do Vite (porta 5173) que repassa para o backend na 3000.
  // Isso evita problemas de CORS — o browser vê tudo como mesma origem.
  static const String _webUrl = 'http://localhost:5173/api/v1';
  // ─── Seleção automática ───────────────────────────────────────────────────────
  static String get baseUrl {
    if (kIsWeb) {
      return _webUrl;
    } else if (Platform.isAndroid) {
      // Troque para _emulatorUrl se estiver usando emulador Android
      return _physicalDeviceUrl;
    } else if (Platform.isIOS) {
      // Troque para 'http://localhost:3000/api/v1' se for simulador iOS
      return _physicalDeviceUrl;
    }
    return _emulatorUrl;
  }

  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // URL base sem /api/v1 (usado para WebSockets)
  static String get baseUrlWithoutApi {
    return baseUrl.replaceAll('/api/v1', '').replaceAll('/api', '');
  }
}

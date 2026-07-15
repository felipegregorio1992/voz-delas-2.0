import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/foundation.dart' show kIsWeb, kDebugMode;
import 'package:shared_preferences/shared_preferences.dart';

// FIX #10: Log seguro — nunca loga tokens ou valores sensíveis
void _safeLog(String message) {
  if (kDebugMode) {
    // ignore: avoid_print
    print(message);
  }
}

class StorageService {
  // FIX #1 (mobile): flutter_secure_storage usa Keychain (iOS) e Keystore (Android)
  // — armazenamento seguro do SO, não acessível por outros apps.
  // No mobile, cookies HttpOnly não são viáveis, então tokens no secure storage é correto.
  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true, // Criptografia adicional no Android
    ),
  );

  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userIdKey = 'user_id';

  // Cache em memória para evitar múltiplas leituras do secure storage
  String? _cachedAccessToken;
  String? _cachedRefreshToken;

  Future<void> saveTokens(String accessToken, String refreshToken) async {
    try {
      // Atualizar cache
      _cachedAccessToken = accessToken;
      _cachedRefreshToken = refreshToken;

      await _storage.write(key: _accessTokenKey, value: accessToken);
      await _storage.write(key: _refreshTokenKey, value: refreshToken);

      // No web, usar SharedPreferences como fallback (secure storage tem limitações no web)
      if (kIsWeb) {
        try {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(_accessTokenKey, accessToken);
          await prefs.setString(_refreshTokenKey, refreshToken);
        } catch (_) {
          // Silencioso — o secure storage já salvou
        }
      }

      // FIX #10: Confirmar salvamento sem logar o token
      _safeLog('✅ Tokens salvos no secure storage');
    } catch (e) {
      // FIX #10: Não logar detalhes do erro (pode conter dados sensíveis)
      _safeLog('❌ Erro ao salvar tokens no secure storage');
    }
  }

  Future<String?> getAccessToken() async {
    // Retornar do cache se disponível
    if (_cachedAccessToken != null && _cachedAccessToken!.isNotEmpty) {
      return _cachedAccessToken;
    }

    try {
      var token = await _storage.read(key: _accessTokenKey);

      if ((token == null || token.isEmpty) && kIsWeb) {
        try {
          final prefs = await SharedPreferences.getInstance();
          token = prefs.getString(_accessTokenKey);
          if (token != null && token.isNotEmpty) {
            _cachedAccessToken = token;
            return token;
          }
        } catch (_) {}
      }

      if (token != null && token.isNotEmpty) {
        _cachedAccessToken = token;
        // FIX #10: Não logar o token — apenas indicar que foi encontrado
        _safeLog('🔑 Access token encontrado no secure storage');
        return token;
      }

      _safeLog('⚠️ Access token não encontrado');
      return null;
    } catch (e) {
      _safeLog('❌ Erro ao ler access token');
      return null;
    }
  }

  Future<String?> getRefreshToken() async {
    if (_cachedRefreshToken != null && _cachedRefreshToken!.isNotEmpty) {
      return _cachedRefreshToken;
    }

    try {
      var token = await _storage.read(key: _refreshTokenKey);

      if ((token == null || token.isEmpty) && kIsWeb) {
        try {
          final prefs = await SharedPreferences.getInstance();
          token = prefs.getString(_refreshTokenKey);
          if (token != null && token.isNotEmpty) {
            _cachedRefreshToken = token;
            return token;
          }
        } catch (_) {}
      }

      if (token != null && token.isNotEmpty) {
        _cachedRefreshToken = token;
        return token;
      }
      return null;
    } catch (e) {
      _safeLog('❌ Erro ao ler refresh token');
      return null;
    }
  }

  Future<void> saveUserId(String userId) async {
    await _storage.write(key: _userIdKey, value: userId);
  }

  Future<String?> getUserId() async {
    return await _storage.read(key: _userIdKey);
  }

  Future<bool> hasToken() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  Future<void> clear() async {
    _cachedAccessToken = null;
    _cachedRefreshToken = null;

    try {
      await _storage.delete(key: _accessTokenKey);
      await _storage.delete(key: _refreshTokenKey);
      await _storage.delete(key: _userIdKey);

      if (kIsWeb) {
        try {
          final prefs = await SharedPreferences.getInstance();
          await prefs.remove(_accessTokenKey);
          await prefs.remove(_refreshTokenKey);
          await prefs.remove(_userIdKey);
        } catch (_) {}
      }

      _safeLog('✅ Storage limpo');
    } catch (e) {
      _safeLog('⚠️ Erro ao limpar storage');
    }
  }
}

final storageServiceProvider = Provider<StorageService>((ref) {
  return StorageService();
});

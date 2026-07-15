import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/api_config.dart';
import '../storage/storage_service.dart';
import '../auth/session_manager.dart';

// FIX #10: Helper para log seguro — nunca loga tokens ou dados sensíveis em produção.
// Em debug, loga apenas metadados (método, URL, status) sem valores de tokens.
void _safeLog(String message) {
  if (kDebugMode) {
    // ignore: avoid_print
    print(message);
  }
}

class DioClient {
  final Dio _dio;
  final StorageService _storage;

  DioClient(this._storage)
      : _dio = Dio(
          BaseOptions(
            baseUrl: ApiConfig.baseUrl,
            connectTimeout: ApiConfig.connectTimeout,
            receiveTimeout: ApiConfig.receiveTimeout,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-Platform': 'mobile', // Identifica requisições do app mobile
            },
            validateStatus: (status) => status != null && status < 600,
          ),
        ) {
    _safeLog('🔧 DioClient inicializado com baseUrl: ${ApiConfig.baseUrl}');
    _setupInterceptors();
  }

  void _setupInterceptors() {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.getAccessToken();

          // FIX #10: Nunca logar o token completo — apenas indicar presença/ausência
          _safeLog('📤 REQUEST: ${options.method} ${options.path}');
          _safeLog('📤 Token presente: ${token != null && token.isNotEmpty}');

          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          } else {
            _safeLog('⚠️ Nenhum token encontrado. Faça login primeiro.');
          }

          return handler.next(options);
        },
        onResponse: (response, handler) async {
          // Como validateStatus aceita tudo (<600), 401 chega aqui como response normal.
          // Precisamos interceptar e tentar refresh.
          if (response.statusCode == 401) {
            final path = response.requestOptions.path;
            _safeLog('🔐 401 Unauthorized detectado (onResponse) - $path');

            final isAuthRequest = path.contains('/auth/login') ||
                path.contains('/auth/register') ||
                path.contains('/auth/refresh');

            if (isAuthRequest) {
              return handler.next(response);
            }

            _safeLog('🔄 Tentando refresh token...');
            final refreshToken = await _storage.getRefreshToken();

            if (refreshToken == null || refreshToken.isEmpty) {
              _safeLog('❌ Refresh token não encontrado');
              await _storage.clear();
              SessionManager.instance.notifySessionExpired();
              return handler.next(response);
            }

            try {
              final refreshDio = Dio(BaseOptions(
                baseUrl: response.requestOptions.baseUrl,
                headers: {'Content-Type': 'application/json'},
                validateStatus: (status) => status != null && status < 500,
              ));

              final refreshResponse = await refreshDio.post(
                '/auth/refresh',
                data: {'refreshToken': refreshToken},
              );

              if (refreshResponse.statusCode == 200 || refreshResponse.statusCode == 201) {
                final data = refreshResponse.data['data'];
                final newAccessToken = data['accessToken'];
                final newRefreshToken = data['refreshToken'];

                _safeLog('✅ Refresh token bem-sucedido');
                await _storage.saveTokens(newAccessToken, newRefreshToken);

                // Refazer a request original com o novo token
                response.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
                final retryResponse = await _dio.fetch(response.requestOptions);
                return handler.resolve(retryResponse);
              } else {
                _safeLog('❌ Refresh token falhou: ${refreshResponse.statusCode}');
                await _storage.clear();
                SessionManager.instance.notifySessionExpired();
                return handler.next(response);
              }
            } catch (e) {
              _safeLog('❌ Erro ao fazer refresh (detalhes omitidos em produção)');
              await _storage.clear();
              SessionManager.instance.notifySessionExpired();
              return handler.next(response);
            }
          }

          return handler.next(response);
        },
        onError: (error, handler) async {
          // FIX #10: Logar apenas metadados do erro, nunca o corpo da resposta
          // (que pode conter dados sensíveis)
          _safeLog('❌ ERRO: ${error.type} - ${error.requestOptions.method} ${error.requestOptions.path}');

          if (error.type == DioExceptionType.connectionTimeout) {
            _safeLog('❌ TIMEOUT: Verifique se o backend está rodando em: ${error.requestOptions.baseUrl}');
          } else if (error.type == DioExceptionType.connectionError) {
            _safeLog('❌ ERRO DE CONEXÃO: Verifique a URL: ${error.requestOptions.baseUrl}');
          }

          final statusCode = error.response?.statusCode;
          final path = error.requestOptions.path;

          _safeLog('❌ STATUS: $statusCode ${error.requestOptions.method} $path');

          if (statusCode == 401) {
            _safeLog('🔐 401 Unauthorized detectado (onError)');

            final isAuthRequest = path.contains('/auth/login') ||
                path.contains('/auth/register') ||
                path.contains('/auth/refresh');

            if (isAuthRequest) {
              return handler.next(error);
            }

            _safeLog('🔄 Tentando refresh token...');
            final refreshToken = await _storage.getRefreshToken();

            if (refreshToken == null || refreshToken.isEmpty) {
              _safeLog('❌ Refresh token não encontrado');
              await _storage.clear();
              SessionManager.instance.notifySessionExpired();
              return handler.next(error);
            }

            try {
              final refreshDio = Dio(BaseOptions(
                baseUrl: error.requestOptions.baseUrl,
                headers: {'Content-Type': 'application/json'},
                validateStatus: (status) => status != null && status < 500,
              ));

              final response = await refreshDio.post(
                '/auth/refresh',
                data: {'refreshToken': refreshToken},
              );

              if (response.statusCode == 200 || response.statusCode == 201) {
                final data = response.data['data'];
                final newAccessToken = data['accessToken'];
                final newRefreshToken = data['refreshToken'];

                _safeLog('✅ Refresh token bem-sucedido');
                await _storage.saveTokens(newAccessToken, newRefreshToken);

                error.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
                final retryResponse = await _dio.fetch(error.requestOptions);
                return handler.resolve(retryResponse);
              } else {
                _safeLog('❌ Refresh token falhou: ${response.statusCode}');
                await _storage.clear();
                SessionManager.instance.notifySessionExpired();
                return handler.next(error);
              }
            } catch (e) {
              // FIX #10: Não logar o erro completo (pode conter dados sensíveis)
              _safeLog('❌ Erro ao fazer refresh (detalhes omitidos em produção)');
              await _storage.clear();
              SessionManager.instance.notifySessionExpired();
              return handler.next(error);
            }
          }

          return handler.next(error);
        },
      ),
    );
  }

  Dio get dio => _dio;
}

final dioClientProvider = Provider<DioClient>((ref) {
  final storage = ref.watch(storageServiceProvider);
  return DioClient(storage);
});

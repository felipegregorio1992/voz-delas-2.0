import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kDebugMode, kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/storage/storage_service.dart';

// FIX #10: Log seguro — nunca loga tokens, senhas ou dados pessoais
void _safeLog(String message) {
  if (kDebugMode) {
    // ignore: avoid_print
    print(message);
  }
}

class AuthService {
  final DioClient _dioClient;
  final StorageService _storage;

  AuthService(this._dioClient, this._storage);

  Future<Map<String, dynamic>> register({
    required String name,
    String? email,
    String? phone,
    required String password,
  }) async {
    try {
      final response = await _dioClient.dio.post(
        '/auth/register',
        data: {
          'name': name,
          if (email != null) 'email': email,
          if (phone != null) 'phone': phone,
          'password': password,
        },
      );

      if (response.statusCode != null && response.statusCode! >= 400) {
        final errorData = response.data;
        final errorMessage = errorData is Map && errorData.containsKey('error')
            ? errorData['error']
            : 'Erro ao cadastrar';
        throw Exception('$errorMessage (Status: ${response.statusCode})');
      }

      dynamic data = response.data;
      if (response.data is Map && response.data.containsKey('data')) {
        data = response.data['data'];
      }

      if (data == null) {
        throw Exception('Dados da resposta estão nulos');
      }

      if (data is Map && data.containsKey('statusCode')) {
        final errorMessage = data['error'] ?? 'Erro ao cadastrar';
        throw Exception('$errorMessage (Status: ${data['statusCode']})');
      }

      if (data['accessToken'] == null || data['refreshToken'] == null) {
        throw Exception('Tokens não foram retornados pelo servidor');
      }

      await _storage.saveTokens(data['accessToken'], data['refreshToken']);
      if (data['user'] != null && data['user']['id'] != null) {
        await _storage.saveUserId(data['user']['id']);
      }

      _safeLog('✅ Registro realizado com sucesso');
      return data;
    } on DioException catch (e) {
      if (e.response != null) {
        final errorData = e.response!.data;
        final errorMessage = errorData is Map && errorData.containsKey('error')
            ? errorData['error']
            : 'Erro ao cadastrar';
        throw Exception('$errorMessage');
      }
      rethrow;
    }
  }

  Future<Map<String, dynamic>> login({
    String? email,
    String? phone,
    required String password,
  }) async {
    try {
      final response = await _dioClient.dio.post(
        '/auth/login',
        data: {
          if (email != null) 'email': email,
          if (phone != null) 'phone': phone,
          'password': password,
        },
      );

      if (response.statusCode != null && response.statusCode! >= 400) {
        final errorData = response.data;
        final errorMessage = errorData is Map && errorData.containsKey('error')
            ? errorData['error']
            : 'Erro ao fazer login';
        throw Exception('$errorMessage (Status: ${response.statusCode})');
      }

      // FIX #10: Não logar response.data (contém tokens e dados pessoais)
      _safeLog('📥 Login response status: ${response.statusCode}');

      if (response.data == null) {
        throw Exception('Resposta do servidor está vazia');
      }

      dynamic data = response.data;
      if (response.data is Map && response.data.containsKey('data')) {
        data = response.data['data'];
      }

      if (data == null) {
        throw Exception('Dados da resposta estão nulos');
      }

      if (data is Map && data.containsKey('statusCode')) {
        final errorMessage = data['error'] ?? 'Erro ao fazer login';
        throw Exception('$errorMessage (Status: ${data['statusCode']})');
      }

      if (data['accessToken'] == null || data['refreshToken'] == null) {
        throw Exception('Tokens não foram retornados pelo servidor');
      }

      await _storage.saveTokens(data['accessToken'], data['refreshToken']);

      if (data['user'] != null && data['user']['id'] != null) {
        await _storage.saveUserId(data['user']['id']);
      }

      _safeLog('✅ Login realizado com sucesso');
      return data;
    } on DioException catch (e) {
      if (e.response != null) {
        final errorData = e.response!.data;
        final errorMessage = errorData is Map && errorData.containsKey('error')
            ? errorData['error']
            : 'Erro ao fazer login';
        throw Exception('$errorMessage');
      }
      rethrow;
    }
  }

  Future<Map<String, dynamic>> loginWithGoogle() async {
    try {
      final googleSignIn = GoogleSignIn(
        clientId: '551386702464-dmcaq6nchto3kqva82ng88v5j2m33j1f.apps.googleusercontent.com',
        serverClientId: kIsWeb ? null : '551386702464-dmcaq6nchto3kqva82ng88v5j2m33j1f.apps.googleusercontent.com',
      );

      final account = await googleSignIn.signIn();
      if (account == null) {
        throw Exception('Login com Google cancelado');
      }

      final auth = await account.authentication;
      final idToken = auth.idToken;

      if (idToken == null) {
        throw Exception('Não foi possível obter o token do Google');
      }

      _safeLog('📥 Google Sign-In: token obtido, enviando ao backend...');

      final response = await _dioClient.dio.post(
        '/auth/google',
        data: {'idToken': idToken},
      );

      if (response.statusCode != null && response.statusCode! >= 400) {
        final errorData = response.data;
        final errorMessage = errorData is Map && errorData.containsKey('error')
            ? errorData['error']
            : 'Erro ao fazer login com Google';
        throw Exception('$errorMessage (Status: ${response.statusCode})');
      }

      dynamic data = response.data;
      if (response.data is Map && response.data.containsKey('data')) {
        data = response.data['data'];
      }

      if (data == null || data['accessToken'] == null || data['refreshToken'] == null) {
        throw Exception('Tokens não foram retornados pelo servidor');
      }

      await _storage.saveTokens(data['accessToken'], data['refreshToken']);

      if (data['user'] != null && data['user']['id'] != null) {
        await _storage.saveUserId(data['user']['id']);
      }

      _safeLog('✅ Login com Google realizado com sucesso');
      return data;
    } on DioException catch (e) {
      if (e.response != null) {
        final errorData = e.response!.data;
        final errorMessage = errorData is Map && errorData.containsKey('error')
            ? errorData['error']
            : 'Erro ao fazer login com Google';
        throw Exception('$errorMessage');
      }
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      final refreshToken = await _storage.getRefreshToken();
      if (refreshToken != null) {
        await _dioClient.dio.post(
          '/auth/logout',
          data: {'refreshToken': refreshToken},
        );
      }
    } catch (_) {
      // Ignorar erros no logout — limpar storage de qualquer forma
    } finally {
      await _storage.clear();
      _safeLog('✅ Logout realizado');
    }
  }
}

final authServiceProvider = Provider<AuthService>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  final storage = ref.watch(storageServiceProvider);
  return AuthService(dioClient, storage);
});

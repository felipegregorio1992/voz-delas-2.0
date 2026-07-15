import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/dio_client.dart';

void _safeLog(String message) {
  if (kDebugMode) {
    // ignore: avoid_print
    print(message);
  }
}

class ProfileService {
  final DioClient _dioClient;

  ProfileService(this._dioClient);

  /// Busca os dados do perfil do usuário autenticado
  Future<Map<String, dynamic>> getProfile() async {
    try {
      final response = await _dioClient.dio.get('/me');

      if (response.statusCode != null && response.statusCode! >= 400) {
        throw Exception('Erro ao buscar perfil (Status: ${response.statusCode})');
      }

      dynamic data = response.data;
      if (response.data is Map && response.data.containsKey('data')) {
        data = response.data['data'];
      }

      _safeLog('✅ Perfil carregado com sucesso');
      return Map<String, dynamic>.from(data);
    } on DioException catch (e) {
      if (e.response != null) {
        final errorData = e.response!.data;
        final errorMessage = errorData is Map && errorData.containsKey('message')
            ? errorData['message']
            : 'Erro ao buscar perfil';
        throw Exception('$errorMessage');
      }
      rethrow;
    }
  }

  /// Atualiza os dados do perfil do usuário
  Future<Map<String, dynamic>> updateProfile({
    String? name,
    String? email,
    String? phone,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (name != null && name.isNotEmpty) data['name'] = name;
      if (email != null && email.isNotEmpty) data['email'] = email;
      if (phone != null && phone.isNotEmpty) data['phone'] = phone;

      final response = await _dioClient.dio.patch('/me', data: data);

      if (response.statusCode != null && response.statusCode! >= 400) {
        final errorData = response.data;
        final errorMessage = errorData is Map && errorData.containsKey('message')
            ? errorData['message']
            : 'Erro ao atualizar perfil';
        throw Exception('$errorMessage');
      }

      dynamic responseData = response.data;
      if (response.data is Map && response.data.containsKey('data')) {
        responseData = response.data['data'];
      }

      _safeLog('✅ Perfil atualizado com sucesso');
      return Map<String, dynamic>.from(responseData);
    } on DioException catch (e) {
      if (e.response != null) {
        final errorData = e.response!.data;
        final errorMessage = errorData is Map && errorData.containsKey('message')
            ? errorData['message']
            : 'Erro ao atualizar perfil';
        throw Exception('$errorMessage');
      }
      rethrow;
    }
  }
}

final profileServiceProvider = Provider<ProfileService>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return ProfileService(dioClient);
});

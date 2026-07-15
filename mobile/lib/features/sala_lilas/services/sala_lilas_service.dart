import 'dart:convert';
import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class SalaLilasService {
  final DioClient _dioClient;

  SalaLilasService(this._dioClient);

  // Criar novo atendimento
  Future<Map<String, dynamic>> createAttendance({
    required String type, // 'IDENTIFIED', 'SEMI_IDENTIFIED', 'ANONYMOUS'
  }) async {
    try {
      final response = await _dioClient.dio.post(
        '/sala-lilas/attendances',
        data: {'type': type},
      );

      final data = response.data['data'] ?? response.data;
      return data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(
        e.response?.data['message'] ?? 'Erro ao criar atendimento',
      );
    }
  }

  // Listar atendimentos ativos
  Future<List<Map<String, dynamic>>> getActiveAttendances() async {
    try {
      final response = await _dioClient.dio.get('/sala-lilas/attendances/active');

      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.cast<Map<String, dynamic>>();
      }
      return [];
    } on DioException catch (e) {
      throw Exception(
        e.response?.data['message'] ?? 'Erro ao buscar atendimentos',
      );
    }
  }

  // Criar sessão de vídeo
  Future<Map<String, dynamic>> createVideoSession({
    required String attendanceId,
    String? attendantId,
  }) async {
    try {
      final response = await _dioClient.dio.post(
        '/sala-lilas/attendances/$attendanceId/video-session',
        data: attendantId != null ? {'attendantId': attendantId} : {},
      );

      final data = response.data['data'] ?? response.data;
      return data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(
        e.response?.data['message'] ?? 'Erro ao criar sessão de vídeo',
      );
    }
  }

  // Obter sessão de vídeo
  Future<Map<String, dynamic>?> getVideoSession(String attendanceId) async {
    try {
      final response = await _dioClient.dio.get(
        '/sala-lilas/attendances/$attendanceId/video-session',
      );

      final data = response.data['data'] ?? response.data;
      return data as Map<String, dynamic>?;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return null;
      }
      throw Exception(
        e.response?.data['message'] ?? 'Erro ao buscar sessão de vídeo',
      );
    }
  }

  // Iniciar sessão de vídeo
  Future<Map<String, dynamic>> startVideoSession(String sessionId) async {
    try {
      final response = await _dioClient.dio.post(
        '/sala-lilas/video-sessions/$sessionId/start',
      );

      final data = response.data['data'] ?? response.data;
      return data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(
        e.response?.data['message'] ?? 'Erro ao iniciar sessão de vídeo',
      );
    }
  }

  // Obter detalhes de um atendimento
  Future<Map<String, dynamic>> getAttendanceById(String attendanceId) async {
    try {
      final response = await _dioClient.dio.get('/sala-lilas/attendances/$attendanceId');

      final data = response.data['data'] ?? response.data;
      return data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(
        e.response?.data['message'] ?? 'Erro ao buscar atendimento',
      );
    }
  }

  // Criar ou atualizar formulário de acolhimento
  Future<Map<String, dynamic>> saveForm({
    required String attendanceId,
    required Map<String, dynamic> formData,
    bool isComplete = false,
  }) async {
    try {
      // Converter Map para JSON string usando jsonEncode
      final formDataString = jsonEncode(formData);

      final response = await _dioClient.dio.post(
        '/sala-lilas/attendances/$attendanceId/form',
        data: {
          'formData': formDataString,
          'isComplete': isComplete,
        },
      );

      final data = response.data['data'] ?? response.data;
      return data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(
        e.response?.data['message'] ?? 'Erro ao salvar formulário',
      );
    }
  }

  // Obter formulário de acolhimento
  Future<Map<String, dynamic>?> getForm(String attendanceId) async {
    try {
      final response = await _dioClient.dio.get(
        '/sala-lilas/attendances/$attendanceId/form',
      );

      final data = response.data['data'] ?? response.data;
      return data as Map<String, dynamic>?;
    } on DioException catch (e) {
      // Se não existir formulário, retorna null
      if (e.response?.statusCode == 404) {
        return null;
      }
      throw Exception(
        e.response?.data['message'] ?? 'Erro ao buscar formulário',
      );
    }
  }

  // Aceitar termo de consentimento
  Future<Map<String, dynamic>> acceptConsent(String attendanceId) async {
    try {
      final response = await _dioClient.dio.post(
        '/sala-lilas/attendances/$attendanceId/consent',
        data: {'status': 'ACCEPTED'},
      );

      final data = response.data['data'] ?? response.data;
      return data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(
        e.response?.data['message'] ?? 'Erro ao aceitar termo',
      );
    }
  }

  // Revogar termo de consentimento
  Future<Map<String, dynamic>> revokeConsent(String attendanceId) async {
    try {
      final response = await _dioClient.dio.post(
        '/sala-lilas/attendances/$attendanceId/consent',
        data: {'status': 'REVOKED'},
      );

      final data = response.data['data'] ?? response.data;
      return data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(
        e.response?.data['message'] ?? 'Erro ao revogar termo',
      );
    }
  }

  // Listar agendamentos
  Future<List<Map<String, dynamic>>> getScheduledAttendances() async {
    try {
      final response = await _dioClient.dio.get('/sala-lilas/attendances/scheduled');

      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.cast<Map<String, dynamic>>();
      }
      return [];
    } on DioException catch (e) {
      throw Exception(
        e.response?.data['message'] ?? 'Erro ao buscar agendamentos',
      );
    }
  }

  Future<Map<String, dynamic>> approveScheduledAttendance(String scheduledAttendanceId) async {
    try {
      final response = await _dioClient.dio.patch(
        '/sala-lilas/attendances/scheduled/$scheduledAttendanceId/approve',
      );
      final data = response.data['data'] ?? response.data;
      return data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(
        e.response?.data['message'] ?? 'Erro ao aprovar agendamento',
      );
    }
  }

  Future<Map<String, dynamic>> rejectScheduledAttendance(String scheduledAttendanceId) async {
    try {
      final response = await _dioClient.dio.patch(
        '/sala-lilas/attendances/scheduled/$scheduledAttendanceId/reject',
      );
      final data = response.data['data'] ?? response.data;
      return data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(
        e.response?.data['message'] ?? 'Erro ao rejeitar agendamento',
      );
    }
  }

  // Criar agendamento
  Future<Map<String, dynamic>> scheduleAttendance({
    required String clientId,
    required DateTime scheduledFor,
    String? serviceType,
    String? notes,
  }) async {
    try {
      final response = await _dioClient.dio.post(
        '/sala-lilas/attendances/schedule/$clientId',
        data: {
          'scheduledFor': scheduledFor.toIso8601String(),
          if (serviceType != null && serviceType.isNotEmpty) 'serviceType': serviceType,
          if (notes != null && notes.isNotEmpty) 'notes': notes,
        },
      );
      final data = response.data['data'] ?? response.data;
      return data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(
        e.response?.data['message'] ?? 'Erro ao criar agendamento',
      );
    }
  }

  // Listar tipos de serviço disponíveis
  Future<List<Map<String, dynamic>>> getServiceTypes() async {
    try {
      final response = await _dioClient.dio.get('/sala-lilas/service-types');
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.cast<Map<String, dynamic>>();
      }
      return [];
    } on DioException catch (e) {
      return [];
    }
  }

  // Obter horários de funcionamento
  Future<List<Map<String, dynamic>>> getOperatingHours() async {
    try {
      final response = await _dioClient.dio.get('/operating-hours');
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.cast<Map<String, dynamic>>();
      }
      return [];
    } on DioException catch (e) {
      return [];
    }
  }

  // Forçar limpeza da sala de vídeo (debug/recuperação)
  Future<void> forceCleanupVideo(String attendanceId) async {
    try {
      await _dioClient.dio.post(
        '/sala-lilas/attendances/$attendanceId/force-cleanup-video',
      );
    } on DioException catch (e) {
      // Logamos o erro mas não impedimos o fluxo principal de continuar
      print('Erro ao forçar limpeza da sala: ${e.message}');
    }
  }
}

final salaLilasServiceProvider = Provider<SalaLilasService>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return SalaLilasService(dioClient);
});

import 'package:dio/dio.dart';
import '../config/api_config.dart';

/// Utilitário para testar a conexão com o backend
class ConnectionTest {
  static Future<bool> testConnection() async {
    try {
      final dio = Dio(
        BaseOptions(
          baseUrl: ApiConfig.baseUrl,
          connectTimeout: const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 5),
        ),
      );

      print('🔍 Testando conexão com: ${ApiConfig.baseUrl}');
      
      final response = await dio.get('/health');
      
      if (response.statusCode == 200) {
        print('✅ Conexão OK! Backend está acessível.');
        return true;
      }
      
      print('⚠️ Backend respondeu mas com status: ${response.statusCode}');
      return false;
    } on DioException catch (e) {
      print('❌ Erro ao testar conexão:');
      print('❌ Tipo: ${e.type}');
      print('❌ Mensagem: ${e.message}');
      
      if (e.type == DioExceptionType.connectionTimeout) {
        print('❌ Timeout: O backend não está respondendo');
      } else if (e.type == DioExceptionType.connectionError) {
        print('❌ Erro de conexão: Não foi possível alcançar o servidor');
        print('❌ Verifique se o backend está rodando');
        print('❌ URL tentada: ${ApiConfig.baseUrl}');
      }
      
      return false;
    } catch (e) {
      print('❌ Erro inesperado: $e');
      return false;
    }
  }
}

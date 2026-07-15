import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/dio_client.dart';

class ChatMessage {
  final String content;
  final bool isUser;

  const ChatMessage({required this.content, required this.isUser});
}

class AiChatService {
  final DioClient _dioClient;

  AiChatService(this._dioClient);

  Future<List<ChatMessage>> loadHistory() async {
    final response = await _dioClient.dio.get('/ai-chat/history');

    final body = response.data is Map && response.data['data'] != null
        ? response.data['data']
        : response.data;

    final List<dynamic> items = body is List ? body : [];
    final List<ChatMessage> messages = [];
    for (final item in items) {
      messages.add(ChatMessage(content: item['userMsg'] as String, isUser: true));
      messages.add(ChatMessage(content: item['aiReply'] as String, isUser: false));
    }
    return messages;
  }

  Future<String> sendMessage(
    String message,
    List<ChatMessage> history,
  ) async {
    final historyPayload = history.map((m) => {
      'role': m.isUser ? 'user' : 'assistant',
      'content': m.content,
    }).toList();

    final response = await _dioClient.dio.post(
      '/ai-chat/message',
      data: {
        'message': message,
        'history': historyPayload,
      },
    );

    print('🤖 AI Chat response status: ${response.statusCode}');
    print('🤖 AI Chat response data: ${response.data}');

    if (response.statusCode == 200) {
      final body = response.data is Map && response.data['data'] != null
          ? response.data['data']
          : response.data;
      final reply = body['reply'];
      if (reply == null) {
        throw Exception('Campo reply ausente: $body');
      }
      return reply.toString();
    }
    throw Exception('Erro ${response.statusCode}: ${response.data}');
  }
}

final aiChatServiceProvider = Provider<AiChatService>((ref) {
  return AiChatService(ref.watch(dioClientProvider));
});

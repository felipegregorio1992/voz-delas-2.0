import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/dio_client.dart';
import '../models/event.dart';

class EventsService {
  final DioClient _dioClient;

  EventsService(this._dioClient);

  Future<List<AppEvent>> getPublishedEvents() async {
    try {
      final response = await _dioClient.dio.get('/events/published');
      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        List<dynamic> list;
        if (data is List) {
          list = data;
        } else if (data is Map && data.containsKey('data')) {
          list = data['data'] is List ? data['data'] : [];
        } else {
          return [];
        }
        return list.map((item) => AppEvent.fromJson(item as Map<String, dynamic>)).toList();
      }
      return [];
    } on DioException catch (e) {
      if (kDebugMode) print('❌ DioException loading events: ${e.message}');
      return [];
    } catch (e) {
      if (kDebugMode) print('❌ Error loading events: $e');
      return [];
    }
  }

  Future<bool> registerForEvent(String eventId) async {
    try {
      final response = await _dioClient.dio.post('/events/register/$eventId');
      return response.statusCode == 200;
    } catch (e) {
      if (kDebugMode) print('❌ Error registering for event: $e');
      return false;
    }
  }

  Future<bool> cancelRegistration(String eventId) async {
    try {
      final response = await _dioClient.dio.post('/events/cancel-registration/$eventId');
      return response.statusCode == 200;
    } catch (e) {
      if (kDebugMode) print('❌ Error cancelling registration: $e');
      return false;
    }
  }
}

final eventsServiceProvider = Provider<EventsService>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return EventsService(dioClient);
});

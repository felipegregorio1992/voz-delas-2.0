import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/dio_client.dart';
import '../models/announcement.dart';

class AnnouncementsService {
  final DioClient _dioClient;

  AnnouncementsService(this._dioClient);

  Future<List<Announcement>> getActiveAnnouncements() async {
    try {
      final response = await _dioClient.dio.get('/announcements/active');

      if (kDebugMode) {
        print('📢 GET /announcements/active -> status: ${response.statusCode}');
        print('📢 Response data type: ${response.data.runtimeType}');
        print('📢 Response data: ${response.data}');
      }

      if (response.statusCode == 200 || response.statusCode == 201) {
        final responseData = response.data;

        List<dynamic> list;
        if (responseData is List) {
          list = responseData;
        } else if (responseData is Map && responseData.containsKey('data')) {
          final inner = responseData['data'];
          if (inner is List) {
            list = inner;
          } else {
            if (kDebugMode) print('📢 data field is not a list: ${inner.runtimeType}');
            return [];
          }
        } else {
          if (kDebugMode) print('📢 Unexpected response format');
          return [];
        }

        if (kDebugMode) print('📢 Parsed ${list.length} announcements');
        return list.map((item) => Announcement.fromJson(item as Map<String, dynamic>)).toList();
      }

      if (kDebugMode) print('📢 Non-success status: ${response.statusCode}');
      return [];
    } on DioException catch (e) {
      if (kDebugMode) print('❌ DioException loading announcements: ${e.type} ${e.message}');
      return [];
    } catch (e) {
      if (kDebugMode) print('❌ Error loading announcements: $e');
      return [];
    }
  }

  Future<bool> dismissAnnouncement(String announcementId) async {
    try {
      final response = await _dioClient.dio.post('/announcements/dismiss/$announcementId');
      return response.statusCode == 200;
    } catch (e) {
      if (kDebugMode) print('❌ Error dismissing announcement: $e');
      return false;
    }
  }
}

final announcementsServiceProvider = Provider<AnnouncementsService>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return AnnouncementsService(dioClient);
});

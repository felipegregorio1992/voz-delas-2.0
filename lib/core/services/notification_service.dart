import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _notifications = FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) return;

    if (!kIsWeb) {
      // Criar canal de notificação para Android (apenas em plataformas móveis)
      const androidChannel = AndroidNotificationChannel(
        'chat_channel',
        'Chat Sala Lilás',
        description: 'Notificações de mensagens do chat',
        importance: Importance.high,
        playSound: true,
        enableVibration: true,
      );

      await _notifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(androidChannel);
    }

    // Configuração Android
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    
    // Configuração iOS
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _notifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (details) {
        // Handler para quando a notificação é clicada
        print('Notificação clicada: ${details.payload}');
      },
    );

    // Solicitar permissão
    await requestPermission();
    
    _initialized = true;
  }

  Future<bool> requestPermission() async {
    if (await Permission.notification.isGranted) {
      return true;
    }

    final status = await Permission.notification.request();
    return status.isGranted;
  }

  Future<void> showChatNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    print('🔔 showChatNotification chamado');
    print('📝 Título: $title');
    print('📝 Corpo: $body');
    
    if (!_initialized) {
      print('⚠️ Serviço não inicializado, inicializando...');
      await initialize();
    }

    print('🔐 Verificando permissão...');
    final hasPermission = await requestPermission();
    print('🔐 Permissão concedida: $hasPermission');
    
    if (!hasPermission) {
      print('❌ Permissão de notificação não concedida');
      return;
    }

    try {
      const androidDetails = AndroidNotificationDetails(
        'chat_channel',
        'Chat Sala Lilás',
        channelDescription: 'Notificações de mensagens do chat',
        importance: Importance.high,
        priority: Priority.high,
        showWhen: true,
        icon: '@mipmap/ic_launcher',
      );

      const iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );

      const notificationDetails = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      final notificationId = DateTime.now().millisecondsSinceEpoch.remainder(100000);
      print('📤 Exibindo notificação com ID: $notificationId');
      
      await _notifications.show(
        notificationId,
        title,
        body,
        notificationDetails,
        payload: payload,
      );
      
      print('✅ Notificação exibida com sucesso');
    } catch (e) {
      print('❌ Erro ao exibir notificação: $e');
      print('❌ Stack trace: ${StackTrace.current}');
      rethrow;
    }
  }

  Future<void> cancelAll() async {
    await _notifications.cancelAll();
  }
}

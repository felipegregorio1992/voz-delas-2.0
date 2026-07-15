import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';
import 'features/auth/pages/login_page.dart';
import 'features/auth/pages/register_page.dart';
import 'features/home/pages/home_page.dart';
import 'features/incidents/pages/incident_form_page.dart';
import 'features/panic/pages/panic_page.dart';
import 'features/trusted_contacts/pages/trusted_contacts_page.dart';
import 'features/support_network/pages/support_network_page.dart';
import 'features/totems/pages/totems_map_page.dart';
import 'features/sala_lilas/pages/sala_lilas_page.dart';
import 'features/sala_lilas/pages/attendance_detail_page.dart';
import 'features/sala_lilas/pages/attendance_form_page.dart';
import 'features/sala_lilas/pages/video_call_page.dart';
import 'features/sala_lilas/pages/schedule_page.dart';
import 'features/marketplace/pages/request_merchant_page.dart';
import 'features/marketplace/pages/my_store_page.dart';
import 'features/marketplace/pages/marketplace_page.dart';
import 'features/marketplace/pages/store_detail_page.dart';
import 'features/marketplace/pages/edit_store_page.dart';
import 'features/marketplace/pages/product_form_page.dart';
import 'features/ai_chat/pages/ai_chat_page.dart';
import 'features/announcements/pages/announcements_page.dart';
import 'features/events/pages/events_page.dart';
import 'features/profile/pages/profile_page.dart';
import 'features/profile/pages/edit_profile_page.dart';
import 'features/profile/pages/change_password_page.dart';
import 'core/storage/storage_service.dart';
import 'core/auth/session_manager.dart';

/// GlobalKey do navigator para permitir navegação de fora da árvore de widgets.
final rootNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  final storageService = ref.watch(storageServiceProvider);

  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/login',
    redirect: (context, state) async {
      // Verificar se tem token de forma assíncrona
      final token = await storageService.getAccessToken();
      final isLoggedIn = token != null && token.isNotEmpty;
      final isLoggingIn = state.matchedLocation == '/login' || state.matchedLocation == '/register' || state.matchedLocation == '/emergency-network' || state.matchedLocation == '/totems';

      if (!isLoggedIn && !isLoggingIn) {
        return '/login';
      }
      if (isLoggedIn && isLoggingIn) {
        return '/home';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterPage(),
      ),
      GoRoute(
        path: '/emergency-network',
        builder: (context, state) => const SupportNetworkPage(),
      ),
      GoRoute(
        path: '/home',
        builder: (context, state) => const HomePage(),
      ),
      GoRoute(
        path: '/incidents/new',
        builder: (context, state) => const IncidentFormPage(),
      ),
      GoRoute(
        path: '/panic',
        builder: (context, state) => const PanicPage(),
      ),
      GoRoute(
        path: '/trusted-contacts',
        builder: (context, state) => const TrustedContactsPage(),
      ),
      GoRoute(
        path: '/support-network',
        builder: (context, state) => const SupportNetworkPage(),
      ),
      GoRoute(
        path: '/totems',
        builder: (context, state) => const TotemsMapPage(),
      ),
      GoRoute(
        path: '/sala-lilas',
        builder: (context, state) => const SalaLilasPage(),
      ),
      GoRoute(
        path: '/schedule',
        builder: (context, state) => const SchedulePage(),
      ),
      GoRoute(
        path: '/sala-lilas/attendance/:id',
        builder: (context, state) {
          final attendanceId = state.pathParameters['id']!;
          return AttendanceDetailPage(attendanceId: attendanceId);
        },
      ),
      GoRoute(
        path: '/sala-lilas/attendance/:id/form',
        builder: (context, state) {
          final attendanceId = state.pathParameters['id']!;
          return AttendanceFormPage(attendanceId: attendanceId);
        },
      ),
      GoRoute(
        path: '/sala-lilas/attendance/:id/video',
        builder: (context, state) {
          final attendanceId = state.pathParameters['id']!;
          return VideoCallPage(attendanceId: attendanceId);
        },
      ),
      GoRoute(
        path: '/marketplace/my-store/edit',
        builder: (context, state) => const EditStorePage(),
      ),
      GoRoute(
        path: '/marketplace/my-store',
        builder: (context, state) => const MyStorePage(),
      ),
      GoRoute(
        path: '/marketplace/products/:id/edit',
        builder: (context, state) {
          final productId = state.pathParameters['id'];
          return ProductFormPage(productId: productId);
        },
      ),
      GoRoute(
        path: '/marketplace/products/new',
        builder: (context, state) => const ProductFormPage(),
      ),
      GoRoute(
        path: '/marketplace/store/:id',
        builder: (context, state) {
          final storeId = state.pathParameters['id']!;
          return StoreDetailPage(storeId: storeId);
        },
      ),
      GoRoute(
        path: '/marketplace/request',
        builder: (context, state) => const RequestMerchantPage(),
      ),
      GoRoute(
        path: '/marketplace',
        builder: (context, state) => const MarketplacePage(),
      ),
      GoRoute(
        path: '/ai-chat',
        builder: (context, state) => const AiChatPage(),
      ),
      GoRoute(
        path: '/announcements',
        builder: (context, state) => const AnnouncementsPage(),
      ),
      GoRoute(
        path: '/events',
        builder: (context, state) => const EventsPage(),
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const ProfilePage(),
      ),
      GoRoute(
        path: '/profile/edit',
        builder: (context, state) => const EditProfilePage(),
      ),
      GoRoute(
        path: '/profile/change-password',
        builder: (context, state) => const ChangePasswordPage(),
      ),
    ],
  );
});

class VozDelasApp extends ConsumerStatefulWidget {
  const VozDelasApp({super.key});

  @override
  ConsumerState<VozDelasApp> createState() => _VozDelasAppState();
}

class _VozDelasAppState extends ConsumerState<VozDelasApp> {
  @override
  void initState() {
    super.initState();
    // Ouvir expiração de sessão e redirecionar para login
    SessionManager.instance.onSessionExpired.listen((_) {
      final router = ref.read(routerProvider);
      // Só redireciona se não estiver já na tela de login
      if (router.routeInformationProvider.value.uri.path != '/login') {
        router.go('/login');
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Voz Delas',
      debugShowCheckedModeBanner: false,
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('pt', 'BR'),
        Locale('en', 'US'),
      ],
      locale: const Locale('pt', 'BR'),
      theme: ThemeData(
        primarySwatch: Colors.purple,
        primaryColor: const Color(0xFF9C27B0),
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF9C27B0),
          brightness: Brightness.light,
        ),
      ),
      routerConfig: router,
    );
  }
}


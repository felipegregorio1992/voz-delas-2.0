import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/utils/geolocation_service.dart';
import '../../../core/storage/storage_service.dart';
import '../../../core/widgets/app_scaffold.dart';

class PanicPage extends ConsumerStatefulWidget {
  const PanicPage({super.key});

  @override
  ConsumerState<PanicPage> createState() => _PanicPageState();
}

class _PanicPageState extends ConsumerState<PanicPage> {
  bool _isActive = false;
  bool _isLoading = false;
  String? _panicEventId;
  Timer? _locationTimer;
  int _secondsActive = 0;
  Timer? _secondsTimer;

  @override
  void initState() {
    super.initState();
    // Verificar se há um pânico ativo ao carregar a página
    _checkActivePanic();
  }

  @override
  void dispose() {
    _locationTimer?.cancel();
    _secondsTimer?.cancel();
    super.dispose();
  }

  Future<void> _checkActivePanic() async {
    try {
      final storage = ref.read(storageServiceProvider);
      final token = await storage.getAccessToken();
      if (token == null || token.isEmpty) return;

      final dioClient = ref.read(dioClientProvider);
      final response = await dioClient.dio.get('/panic/active');

      if (response.data == null) return;

      dynamic panicEvent;
      if (response.data is Map<String, dynamic>) {
        final dataMap = response.data as Map<String, dynamic>;
        if (dataMap.containsKey('data') && dataMap['data'] != null) {
          panicEvent = dataMap['data'];
        } else if (dataMap.containsKey('id')) {
          panicEvent = dataMap;
        }
      }

      if (panicEvent != null && panicEvent is Map) {
        final panicId = panicEvent['id']?.toString();
        if (panicId != null && panicId.isNotEmpty && panicId != 'null') {
          final startedAtStr = panicEvent['startedAt'];
          if (startedAtStr != null) {
            try {
              final startedAt = DateTime.parse(startedAtStr);
              _secondsActive = DateTime.now().difference(startedAt).inSeconds;
            } catch (_) {
              _secondsActive = 0;
            }
          }

          if (mounted) {
            setState(() {
              _isActive = true;
              _panicEventId = panicId;
            });
            _secondsTimer?.cancel();
            _secondsTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
              if (mounted) setState(() => _secondsActive++);
            });
            _startLocationStream();
          }
        }
      }
    } on DioException catch (e) {
      if (e.response?.statusCode != 404) {
        // 404 é normal (sem pânico ativo) — outros erros são inesperados
      }
    } catch (_) {
      // Estado já está como inativo por padrão
    }
  }

  Future<void> _activatePanic() async {
    setState(() => _isLoading = true);

    // Salvar referências antes dos awaits para evitar uso de contexto desmontado
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    final router = GoRouter.of(context);

    try {
      final storage = ref.read(storageServiceProvider);
      final token = await storage.getAccessToken();

      if (token == null || token.isEmpty) {
        if (mounted) {
          scaffoldMessenger.showSnackBar(
            const SnackBar(
              content: Text('Você precisa fazer login primeiro.'),
              backgroundColor: Colors.red,
              duration: Duration(seconds: 3),
            ),
          );
          router.go('/login');
        }
        if (mounted) setState(() => _isLoading = false);
        return;
      }

      final dioClient = ref.read(dioClientProvider);
      final response = await dioClient.dio.post('/panic');

      if (response.data == null) {
        throw Exception('Resposta do servidor está vazia');
      }

      dynamic panicEvent = response.data;
      if (response.data is Map && response.data.containsKey('data')) {
        panicEvent = response.data['data'];
      }

      String? extractedId;
      if (panicEvent is Map) {
        extractedId = panicEvent['id']?.toString();
      }

      if (extractedId == null || extractedId.isEmpty || extractedId == 'null') {
        throw Exception('ID do evento de pânico não encontrado na resposta');
      }

      _panicEventId = extractedId;

      if (mounted) {
        setState(() {
          _isActive = true;
          _isLoading = false;
          _secondsActive = 0;
        });
      }

      _secondsTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (mounted) setState(() => _secondsActive++);
      });

      _startLocationStream();

      scaffoldMessenger.showSnackBar(
        const SnackBar(
          content: Text('Pânico acionado! Sua localização está sendo rastreada.'),
          backgroundColor: Colors.red,
          duration: Duration(seconds: 5),
        ),
      );
    } on DioException catch (e) {
      if (mounted) setState(() => _isLoading = false);

      String errorMessage;
      if (e.response?.statusCode == 401) {
        errorMessage = 'Sessão expirada. Faça login novamente.';
        scaffoldMessenger.showSnackBar(
          SnackBar(content: Text(errorMessage), backgroundColor: Colors.red),
        );
        await Future.delayed(const Duration(seconds: 2));
        if (mounted) router.go('/login');
        return;
      } else if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        errorMessage = 'Tempo esgotado ao conectar com o servidor.';
      } else if (e.type == DioExceptionType.connectionError) {
        errorMessage = 'Não foi possível conectar ao servidor.';
      } else {
        errorMessage = 'Não foi possível acionar o pânico. Tente novamente.';
      }

      scaffoldMessenger.showSnackBar(
        SnackBar(
          content: Text(errorMessage),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 8),
        ),
      );
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
      scaffoldMessenger.showSnackBar(
        const SnackBar(
          content: Text('Não foi possível acionar o pânico. Tente novamente.'),
          backgroundColor: Colors.red,
          duration: Duration(seconds: 8),
        ),
      );
    }
  }

  void _startLocationStream() {
    if (_panicEventId == null) return;

    final geolocationService = GeolocationService();

    _locationTimer = Timer.periodic(const Duration(seconds: 5), (timer) async {
      if (!_isActive || _panicEventId == null) {
        timer.cancel();
        return;
      }

      try {
        final position = await geolocationService.getCurrentPosition();
        final dioClient = ref.read(dioClientProvider);
        await dioClient.dio.post(
          '/panic/$_panicEventId/locations',
          data: {
            'lat': position.latitude,
            'lng': position.longitude,
            'accuracy': position.accuracy,
          },
        );
      } on DioException catch (e) {
        if (e.response?.statusCode == 404) {
          // Evento não existe mais — parar o timer
          timer.cancel();
        }
        // Outros erros: continuar tentando (ex: timeout, rede instável)
      } catch (_) {
        // Continuar tentando mesmo com erro de localização
      }
    });
  }

  Future<void> _endPanic() async {
    if (_panicEventId == null) return;

    setState(() => _isLoading = true);

    // Salvar referências antes dos awaits
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    final router = GoRouter.of(context);

    try {
      final dioClient = ref.read(dioClientProvider);
      await dioClient.dio.post('/panic/$_panicEventId/end');

      _locationTimer?.cancel();
      _secondsTimer?.cancel();

      if (mounted) {
        setState(() {
          _isActive = false;
          _isLoading = false;
          _panicEventId = null;
          _secondsActive = 0;
        });
      }

      scaffoldMessenger.showSnackBar(
        const SnackBar(
          content: Text('Pânico encerrado'),
          backgroundColor: Colors.green,
        ),
      );
      router.go('/home');
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
      scaffoldMessenger.showSnackBar(
        SnackBar(
          content: Text('Erro ao encerrar pânico: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  String _formatDuration(int seconds) {
    final minutes = seconds ~/ 60;
    final secs = seconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showBackButton: true,
      title: 'Botão do Pânico',
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (_isActive) ...[
                  const Icon(
                    Icons.warning_rounded,
                    size: 120,
                    color: Colors.red,
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'PÂNICO ATIVO',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: Colors.red,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _formatDuration(_secondsActive),
                    style: const TextStyle(
                      fontSize: 48,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Sua localização está sendo rastreada',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.grey,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 40),
                  ElevatedButton(
                    onPressed: _isLoading ? null : _endPanic,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 48,
                        vertical: 16,
                      ),
                    ),
                    child: _isLoading
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text(
                            'ENCERRAR PÂNICO',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                  ),
                ] else ...[
                  const Icon(
                    Icons.warning_rounded,
                    size: 120,
                    color: Colors.red,
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'BOTÃO DO PÂNICO',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Acione em caso de emergência',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.grey,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 40),
                  ElevatedButton(
                    onPressed: _isLoading ? null : _activatePanic,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 48,
                        vertical: 24,
                      ),
                    ),
                    child: _isLoading
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text(
                            'ACIONAR PÂNICO',
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}



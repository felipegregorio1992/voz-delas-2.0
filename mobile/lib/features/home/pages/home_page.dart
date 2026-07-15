import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../announcements/models/announcement.dart';
import '../../announcements/services/announcements_service.dart';
import '../../announcements/widgets/notice_dialog.dart';

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  bool _isCheckingStore = true;
  bool _hasStore = false;
  List<Announcement> _banners = [];
  List<Announcement> _notices = [];
  int _unreadCount = 0;
  bool _noticesShown = false;

  @override
  void initState() {
    super.initState();
    _checkStore();
    _loadAnnouncements();
  }

  Future<void> _loadAnnouncements() async {
    try {
      final service = ref.read(announcementsServiceProvider);
      final announcements = await service.getActiveAnnouncements();

      if (kDebugMode) {
        print('📢 Announcements carregados: ${announcements.length}');
        for (final a in announcements) {
          print('  - [${a.type}] ${a.title} | img: ${a.imageUrl} | dismissed: ${a.dismissed}');
        }
      }

      if (!mounted) return;

      setState(() {
        _banners = announcements.where((a) => a.isBanner).toList();
        _notices = announcements.where((a) => a.isNotice && !a.dismissed).toList();
        _unreadCount = announcements.where((a) => !a.dismissed).length;
      });

      if (kDebugMode) {
        print('📢 Banners: ${_banners.length}, Notices: ${_notices.length}');
      }

      // Mostrar avisos como dialog
      if (_notices.isNotEmpty && !_noticesShown) {
        _noticesShown = true;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _showNoticeDialogs();
        });
      }
    } catch (e) {
      if (kDebugMode) {
        print('❌ Erro ao carregar announcements: $e');
      }
    }
  }

  void _showNoticeDialogs() {
    if (_notices.isEmpty || !mounted) return;
    _showNoticeAtIndex(0);
  }

  void _showNoticeAtIndex(int index) {
    if (index >= _notices.length || !mounted) return;

    final notice = _notices[index];

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => NoticeDialog(
        notice: notice,
        onClose: () {
          Navigator.of(ctx).pop();
          // Mostrar próximo aviso
          _showNoticeAtIndex(index + 1);
        },
        onDismissPermanently: () {
          Navigator.of(ctx).pop();
          // Dispensar permanentemente via API
          final service = ref.read(announcementsServiceProvider);
          service.dismissAnnouncement(notice.id);
          // Mostrar próximo aviso
          _showNoticeAtIndex(index + 1);
        },
      ),
    );
  }

  Future<void> _checkStore() async {
    setState(() => _isCheckingStore = true);

    try {
      final dioClient = ref.read(dioClientProvider);
      final response = await dioClient.dio.get('/merchants/me');
      
      final data = response.data['data'] ?? response.data;
      // Verificar se realmente tem uma loja válida (deve ter id e estar ativa)
      if (data != null && 
          data is Map && 
          data.containsKey('id') &&
          data['id'] != null &&
          data['id'].toString().isNotEmpty) {
        // Verificar se a loja está ativa (se o campo existir)
        final isActive = data['isActive'] ?? true;
        setState(() {
          _hasStore = isActive == true;
        });
      } else {
        setState(() {
          _hasStore = false;
        });
      }
    } on DioException catch (e) {
      // 404 ou qualquer erro significa que não tem loja aprovada
      setState(() {
        _hasStore = false;
      });
    } catch (e) {
      // Qualquer erro significa que não tem loja
      setState(() {
        _hasStore = false;
      });
    } finally {
      if (mounted) {
        setState(() => _isCheckingStore = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = _unreadCount;

    return AppScaffold(
      title: 'Voz Delas',
      actions: [
        // Ícone de notificação com badge
        Stack(
          children: [
            IconButton(
              icon: const Icon(Icons.notifications_outlined),
              tooltip: 'Avisos',
              onPressed: () async {
                await context.push('/announcements');
                // Recarregar ao voltar para atualizar o badge
                _loadAnnouncements();
              },
            ),
            if (unreadCount > 0)
              Positioned(
                right: 4,
                top: 4,
                child: Container(
                  padding: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    color: Colors.red,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  constraints: const BoxConstraints(
                    minWidth: 18,
                    minHeight: 18,
                  ),
                  child: Text(
                    unreadCount > 99 ? '99+' : '$unreadCount',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
          ],
        ),
        IconButton(
          icon: const Icon(Icons.person_outline, color: Color(0xFF1F2937)),
          onPressed: () => context.push('/profile'),
        ),
      ],
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            await _checkStore();
            await _loadAnnouncements();
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(24.0),
            child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 20),
              const Text(
                'Como podemos ajudar?',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              // Botão do Pânico (destaque)
              Card(
                elevation: 4,
                color: Colors.red.shade600,
                child: InkWell(
                  onTap: () => context.push('/panic'),
                  child: Padding(
                    padding: const EdgeInsets.all(32.0),
                    child: Column(
                      children: [
                        const Icon(
                          Icons.warning_rounded,
                          size: 64,
                          color: Colors.white,
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'BOTÃO DO PÂNICO',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Acione em caso de emergência',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.white.withOpacity(0.9),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              // Registrar Denúncia
              Card(
                elevation: 2,
                child: ListTile(
                  leading: const Icon(Icons.report, size: 32),
                  title: const Text(
                    'Registrar Denúncia',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: const Text('Registre um incidente'),
                  trailing: const Icon(Icons.arrow_forward_ios),
                  onTap: () => context.push('/incidents/new'),
                ),
              ),
              const SizedBox(height: 16),
              // Contatos de Confiança
              Card(
                elevation: 2,
                child: ListTile(
                  leading: const Icon(Icons.contacts, size: 32),
                  title: const Text(
                    'Contatos de Confiança',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: const Text('Gerencie seus contatos (máx. 3)'),
                  trailing: const Icon(Icons.arrow_forward_ios),
                  onTap: () => context.push('/trusted-contacts'),
                ),
              ),
              const SizedBox(height: 16),
              // Sala Lilás Virtual
              Card(
                elevation: 2,
                color: Colors.purple.shade50,
                child: ListTile(
                  leading: const Icon(Icons.chat_bubble_outline, size: 32, color: Colors.purple),
                  title: const Text(
                    'Sala Lilás Virtual',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: const Text('Atendimento humanizado e seguro'),
                  trailing: const Icon(Icons.arrow_forward_ios),
                  onTap: () => context.push('/sala-lilas'),
                ),
              ),
              const SizedBox(height: 16),
              // Agendar Atendimento
              Card(
                elevation: 2,
                color: Colors.deepPurple.shade50,
                child: ListTile(
                  leading: const Icon(Icons.calendar_month, size: 32, color: Colors.deepPurple),
                  title: const Text(
                    'Agendar Atendimento',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: const Text('Marque um horário na Sala Lilás'),
                  trailing: const Icon(Icons.arrow_forward_ios),
                  onTap: () => context.push('/schedule'),
                ),
              ),
              const SizedBox(height: 16),
              // Eventos e Atividades
              Card(
                elevation: 2,
                color: Colors.green.shade50,
                child: ListTile(
                  leading: const Icon(Icons.event_available, size: 32, color: Colors.green),
                  title: const Text(
                    'Eventos e Atividades',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: const Text('Cursos, oficinas e atividades físicas'),
                  trailing: const Icon(Icons.arrow_forward_ios),
                  onTap: () => context.push('/events'),
                ),
              ),
              const SizedBox(height: 16),
              // Assistente IA
              Card(
                elevation: 2,
                color: Colors.deepPurple.shade50,
                child: ListTile(
                  leading: const Icon(Icons.smart_toy_outlined, size: 32, color: Colors.deepPurple),
                  title: const Text(
                    'Assistente Virtual',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: const Text('Tire dúvidas sobre o app'),
                  trailing: const Icon(Icons.arrow_forward_ios),
                  onTap: () => context.push('/ai-chat'),
                ),
              ),
              const SizedBox(height: 16),
              // Rede de Apoio
              Card(
                elevation: 2,
                child: ListTile(
                  leading: const Icon(Icons.support_agent, size: 32),
                  title: const Text(
                    'Rede de Apoio',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: const Text('CEAMs, DEAMs e outros serviços'),
                  trailing: const Icon(Icons.arrow_forward_ios),
                  onTap: () => context.push('/support-network'),
                ),
              ),
              const SizedBox(height: 16),
              // Totens de Apoio
              Card(
                elevation: 2,
                child: ListTile(
                  leading: const Icon(Icons.pin_drop, size: 32, color: Color(0xFF6A0DAD)),
                  title: const Text(
                    'Totens de Apoio',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: const Text('Pontos de suporte à mulher no mapa'),
                  trailing: const Icon(Icons.arrow_forward_ios),
                  onTap: () => context.push('/totems'),
                ),
              ),
              const SizedBox(height: 16),
              // Ver Lojas (sempre visível)
              Card(
                elevation: 2,
                color: Colors.blue.shade50,
                child: ListTile(
                  leading: const Icon(Icons.shopping_bag, size: 32, color: Colors.blue),
                  title: const Text(
                    'Ver Lojas',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: const Text('Explore produtos e serviços'),
                  trailing: const Icon(Icons.arrow_forward_ios),
                  onTap: () => context.push('/marketplace'),
                ),
              ),
              // Ser Empreendedora (apenas se NÃO tiver loja aprovada)
              // IMPORTANTE: Primeiro o usuário precisa solicitar, depois pode gerenciar
              if (!_isCheckingStore && !_hasStore) ...[
                const SizedBox(height: 16),
                Card(
                  elevation: 2,
                  color: Colors.green.shade50,
                  child: ListTile(
                    leading: const Icon(Icons.business, size: 32, color: Colors.green),
                    title: const Text(
                      'Ser Empreendedora',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: const Text('Solicite sua loja no marketplace'),
                    trailing: const Icon(Icons.arrow_forward_ios),
                    onTap: () => context.push('/marketplace/request'),
                  ),
                ),
              ],
              // Minha Loja (apenas se tiver loja aprovada e ativa)
              // IMPORTANTE: Só aparece DEPOIS de solicitar e ser aprovado
              if (!_isCheckingStore && _hasStore) ...[
                const SizedBox(height: 16),
                Card(
                  elevation: 2,
                  color: Colors.purple.shade50,
                  child: ListTile(
                    leading: const Icon(Icons.store, size: 32, color: Colors.purple),
                    title: const Text(
                      'Minha Loja',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: const Text('Gerencie sua loja e produtos'),
                    trailing: const Icon(Icons.arrow_forward_ios),
                    onTap: () => context.push('/marketplace/my-store'),
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


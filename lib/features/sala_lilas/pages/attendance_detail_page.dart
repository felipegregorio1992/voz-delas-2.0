import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../services/sala_lilas_service.dart';
import '../services/chat_service.dart';
import '../../../core/services/notification_service.dart';
import '../../../core/storage/storage_service.dart';
import '../../../core/widgets/app_scaffold.dart';

class AttendanceDetailPage extends ConsumerStatefulWidget {
  final String attendanceId;

  const AttendanceDetailPage({
    super.key,
    required this.attendanceId,
  });

  @override
  ConsumerState<AttendanceDetailPage> createState() => _AttendanceDetailPageState();
}

class _AttendanceDetailPageState extends ConsumerState<AttendanceDetailPage> {
  bool _isLoading = true;
  Map<String, dynamic>? _attendance;
  Map<String, dynamic>? _form;
  bool _consentAccepted = false;
  String? _error;
  int _currentStep = 0; // 0: Consentimento, 1: Formulário, 2: Chat
  
  // Chat state
  List<Map<String, dynamic>> _messages = [];
  bool _isChatConnected = false;
  bool _chatHidden = false;
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  late final VoidCallback _messageListener;
  ChatService? _chatService; // referência guardada para uso no dispose()
  
  // Video call state
  Map<String, dynamic>? _activeVideoSession;

  @override
  void initState() {
    super.initState();
    _messageListener = () {
      // Atualizar UI quando o texto mudar para habilitar/desabilitar botão
      if (mounted) {
        setState(() {});
      }
    };
    _messageController.addListener(_messageListener);
    _initializeNotifications();
    _loadAttendance();
  }

  Future<void> _initializeNotifications() async {
    try {
      await NotificationService().initialize();
    } catch (e) {
      print('⚠️ Erro ao inicializar notificações: $e');
    }
  }

  @override
  void dispose() {
    _messageController.removeListener(_messageListener);
    _messageController.dispose();
    _scrollController.dispose();
    // Usar referência guardada em vez de ref.read() — ref já está inválido no dispose()
    _chatService?.disconnect();
    super.dispose();
  }

  Future<void> _connectChat() async {
    // Salvar referências antes de qualquer await
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    try {
      final chatService = ref.read(chatServiceProvider);
      _chatService = chatService; // guardar referência para uso no dispose()
      
      // Callback para novas mensagens
      final storageService = ref.read(storageServiceProvider);
      final currentUserId = await storageService.getUserId();
      
      // Verificar se ainda está montado após o await
      if (!mounted) return;

      await chatService.connect(
        widget.attendanceId,
        (message) {
          if (mounted) {
            setState(() {
              _messages.add(message);
            });
            _scrollToBottom();
            
            final isOwnMessage = message['senderId'] == currentUserId;
            if (!isOwnMessage) {
              _showMessageNotification(message);
            }
          }
        },
        onVideoCallStarted: (session) {
          if (mounted) {
            setState(() {
              _activeVideoSession = session;
            });
            _showVideoCallNotification(session);
          }
        },
        onChatVisibilityChanged: (hidden) {
          if (mounted) {
            setState(() {
              _chatHidden = hidden;
            });
          }
        },
        onChatReady: (initialHidden) {
          if (mounted) {
            setState(() {
              _chatHidden = initialHidden;
            });
          }
          _loadChatHistory();
        },
      );
      
      // Aguardar conexão ser estabelecida — verificar se ainda montado a cada iteração
      for (int i = 0; i < 10; i++) {
        await Future.delayed(const Duration(milliseconds: 300));
        if (!mounted) return; // sair imediatamente se desmontado
        if (chatService.isConnected) break;
      }
      
      if (mounted) {
        setState(() {
          _isChatConnected = chatService.isConnected;
        });
      }
    } catch (e) {
      print('❌ Erro ao conectar chat: $e');
      // Usar referência salva antes dos awaits — seguro mesmo se desmontado
      if (mounted) {
        scaffoldMessenger.showSnackBar(
          SnackBar(
            content: Text('Erro ao conectar chat: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _loadChatHistory() async {
    // Usar referência guardada em vez de ref.read (seguro após dispose)
    final chatService = _chatService;
    if (chatService == null || !chatService.isConnected) return;
    try {
      final history = await chatService.getMessages();
      if (mounted) {
        setState(() {
          _isChatConnected = true;
          _messages = history;
        });
        _scrollToBottom();
      }
    } catch (e) {
      // ignorar erros de histórico silenciosamente
    }
  }

  void _hideChat() {
    _chatService?.hideChatOnMobile();
  }

  Future<void> _sendMessage() async {
    if (_messageController.text.trim().isEmpty) return;

    // Salvar referências antes dos awaits
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    if (!_isChatConnected) {
      scaffoldMessenger.showSnackBar(
        const SnackBar(
          content: Text('Chat não está conectado. Aguarde...'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final messageText = _messageController.text.trim();
    _messageController.clear();

    try {
      // Usar referência guardada em vez de ref.read
      final chatService = _chatService;
      if (chatService == null) return;

      final success = await chatService.sendMessage(messageText);
      
      if (!success && mounted) {
        scaffoldMessenger.showSnackBar(
          const SnackBar(
            content: Text('Erro ao enviar mensagem. Tente novamente.'),
            backgroundColor: Colors.red,
          ),
        );
        _messageController.text = messageText;
      }
    } catch (e) {
      if (mounted) {
        scaffoldMessenger.showSnackBar(
          SnackBar(
            content: Text('Erro ao enviar mensagem: $e'),
            backgroundColor: Colors.red,
          ),
        );
        _messageController.text = messageText;
      }
    }
  }

  Future<void> _showMessageNotification(Map<String, dynamic> message) async {
    try {
      print('🔔 Iniciando processo de notificação...');
      
      final senderName = message['senderName'] ?? 'Usuário';
      final messageText = message['message'] ?? '';
      final preview = messageText.length > 50 
          ? '${messageText.substring(0, 50)}...' 
          : messageText;

      print('📝 Título: 💜 Nova Mensagem - Sala Lilás');
      print('📝 Corpo: $senderName: $preview');

      await NotificationService().showChatNotification(
        title: '💜 Nova Mensagem - Sala Lilás',
        body: '$senderName: $preview',
        payload: widget.attendanceId,
      );
      
      print('✅ Notificação enviada com sucesso');
    } catch (e) {
      print('❌ Erro ao mostrar notificação: $e');
      print('❌ Stack trace: ${StackTrace.current}');
    }
  }

  Future<void> _showVideoCallNotification(Map<String, dynamic> session) async {
    try {
      print('🎥 Iniciando notificação de videochamada...');
      
      await NotificationService().showChatNotification(
        title: '🎥 Videochamada Disponível - Sala Lilás',
        body: 'Uma videochamada foi iniciada. Toque para entrar.',
        payload: widget.attendanceId,
      );
      
      print('✅ Notificação de videochamada enviada');
    } catch (e) {
      print('❌ Erro ao mostrar notificação de videochamada: $e');
    }
  }

  Future<void> _loadAttendance() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final service = ref.read(salaLilasServiceProvider);
      final attendance = await service.getAttendanceById(widget.attendanceId);
      final form = await service.getForm(widget.attendanceId);

      setState(() {
        _attendance = attendance;
        _form = form;
        _consentAccepted = attendance['consentTerm']?['status'] == 'ACCEPTED';
        _isLoading = false;
      });

      // Verificar se já existe sessão de vídeo ativa (PENDING ou ACTIVE)
      try {
        print('🔍 Verificando se existe sessão de vídeo ativa...');
        final videoSession = await service.getVideoSession(widget.attendanceId);
        if (videoSession != null) {
          print('📹 Sessão encontrada: ${videoSession['id']}, Status: ${videoSession['status']}');
          if (videoSession['status'] == 'ACTIVE' || videoSession['status'] == 'PENDING') {
            setState(() {
              _activeVideoSession = videoSession;
            });
            print('✅ Sessão de vídeo disponível: ${videoSession['id']}');
          }
        } else {
          print('ℹ️ Nenhuma sessão de vídeo encontrada');
        }
      } catch (e) {
        print('⚠️ Erro ao verificar sessão de vídeo: $e');
      }

      // Conectar ao chat se consentimento foi aceito e formulário completo
      if (_consentAccepted && form != null && form['isComplete'] == true) {
        _connectChat();
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _acceptConsent() async {
    try {
      final service = ref.read(salaLilasServiceProvider);
      await service.acceptConsent(widget.attendanceId);
      
      if (mounted) {
        // Usar go() em vez de push() para substituir a rota atual
        // Assim, ao voltar do formulário, não volta para esta página
        context.go('/sala-lilas/attendance/${widget.attendanceId}/form');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao aceitar termo: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return AppScaffold(
        title: 'Atendimento - Sala Lilás',
        showBackButton: true,
        onBack: () => context.go('/sala-lilas'),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null || _attendance == null) {
      return AppScaffold(
        title: 'Atendimento - Sala Lilás',
        showBackButton: true,
        onBack: () => context.go('/sala-lilas'),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Text(
                'Erro ao carregar atendimento',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(
                _error ?? 'Atendimento não encontrado',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey.shade600),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => context.go('/sala-lilas'),
                child: const Text('Voltar'),
              ),
            ],
          ),
        ),
      );
    }

    return AppScaffold(
      title: '💜 Sala Lilás Virtual',
      showBackButton: true,
      onBack: () => context.go('/home'),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Informações do atendimento
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Atendimento #${widget.attendanceId.substring(0, 8)}',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Chip(
                          label: Text(
                            _getStatusLabel(_attendance!['status']),
                            style: const TextStyle(fontSize: 11),
                          ),
                          backgroundColor: _getStatusColor(_attendance!['status']),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Tipo: ${_getTypeLabel(_attendance!['type'])}',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Termo de Consentimento
            if (!_consentAccepted) ...[
              Card(
                color: Colors.orange.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.warning_amber, color: Colors.orange.shade700),
                          const SizedBox(width: 8),
                          const Text(
                            'Termo de Acolhimento, Sigilo e Consentimento',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Antes de iniciar o atendimento, é necessário aceitar o Termo de Acolhimento, Sigilo e Consentimento.',
                        style: TextStyle(fontSize: 14),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Este termo garante:\n'
                        '• Sigilo absoluto das informações\n'
                        '• Proteção dos seus dados pessoais\n'
                        '• Consentimento para registro do atendimento\n'
                        '• Direito de revogar o consentimento a qualquer momento',
                        style: TextStyle(fontSize: 13),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _acceptConsent,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.purple,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                          child: const Text('Aceitar Termo'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Formulário de Acolhimento
            if (_consentAccepted) ...[
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.description, color: Colors.purple),
                          const SizedBox(width: 8),
                          const Text(
                            'Formulário de Acolhimento',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      if (_form == null)
                        Column(
                          children: [
                            const Text(
                              'Preencha o formulário de acolhimento para iniciar o atendimento.',
                              style: TextStyle(fontSize: 14),
                            ),
                            const SizedBox(height: 16),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: () {
                                  context.push('/sala-lilas/attendance/${widget.attendanceId}/form');
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.purple,
                                  foregroundColor: Colors.white,
                                ),
                                child: const Text('Preencher Formulário'),
                              ),
                            ),
                          ],
                        )
                      else
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _form!['isComplete'] == true
                                  ? '✅ Formulário completo'
                                  : '📝 Formulário em preenchimento',
                              style: TextStyle(
                                color: _form!['isComplete'] == true
                                    ? Colors.green
                                    : Colors.orange,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8),
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton(
                                onPressed: () {
                                  context.push('/sala-lilas/attendance/${widget.attendanceId}/form');
                                },
                                child: const Text('Editar Formulário'),
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Botão de Videochamada
            if (_consentAccepted && _form != null && _form!['isComplete'] == true) ...[
              Card(
                color: _activeVideoSession != null 
                    ? Colors.green.shade50 
                    : Colors.blue.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            _activeVideoSession != null 
                                ? Icons.videocam 
                                : Icons.videocam_outlined,
                            color: _activeVideoSession != null 
                                ? Colors.green.shade700 
                                : Colors.blue.shade700,
                            size: 32,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _activeVideoSession != null 
                                      ? 'Videochamada Disponível' 
                                      : 'Videochamada',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: _activeVideoSession != null 
                                        ? Colors.green.shade700 
                                        : Colors.blue.shade700,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _activeVideoSession != null 
                                      ? 'O atendente iniciou uma videochamada. Toque para entrar.' 
                                      : 'Toque para iniciar ou entrar em uma videochamada.',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: _activeVideoSession != null 
                                        ? Colors.green.shade600 
                                        : Colors.blue.shade600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            context.push('/sala-lilas/attendance/${widget.attendanceId}/video');
                          },
                          icon: const Icon(Icons.videocam),
                          label: Text(
                            _activeVideoSession != null 
                                ? 'Entrar na Videochamada' 
                                : 'Iniciar Videochamada',
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _activeVideoSession != null 
                                ? Colors.green.shade700 
                                : Colors.blue.shade700,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Chat em Tempo Real
            if (_consentAccepted && _form != null && _form!['isComplete'] == true) ...[
              if (_chatHidden)
                Card(
                  color: Colors.orange.shade50,
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Row(
                      children: [
                        Icon(Icons.visibility_off, color: Colors.orange.shade700),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Chat ocultado por segurança. Será reexibido pelo atendente.',
                            style: TextStyle(
                              color: Colors.orange.shade800,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              else
              Card(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Row(
                        children: [
                          const Icon(Icons.chat, color: Colors.purple),
                          const SizedBox(width: 8),
                          const Text(
                            'Chat Seguro',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const Spacer(),
                          // Botão ocultar — só oculta, reexibir é pelo web
                          if (_isChatConnected)
                            GestureDetector(
                              onTap: _hideChat,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.orange.shade600,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.visibility_off, color: Colors.white, size: 14),
                                    SizedBox(width: 4),
                                    Text(
                                      'Ocultar',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: _isChatConnected ? Colors.green : Colors.red,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              _isChatConnected ? 'Conectado' : 'Desconectado',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      height: 300,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        border: Border(
                          top: BorderSide(color: Colors.grey.shade300),
                          bottom: BorderSide(color: Colors.grey.shade300),
                        ),
                      ),
                      child: _messages.isEmpty
                          ? const Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.chat_bubble_outline, size: 48, color: Colors.grey),
                                  SizedBox(height: 8),
                                  Text(
                                    'Nenhuma mensagem ainda',
                                    style: TextStyle(color: Colors.grey),
                                  ),
                                ],
                              ),
                            )
                          : ListView.builder(
                              controller: _scrollController,
                              padding: const EdgeInsets.all(8),
                              itemCount: _messages.length,
                              itemBuilder: (context, index) {
                                final message = _messages[index];
                                final isOwn = message['senderId'] == _attendance?['clientId'];
                                return Align(
                                  alignment: isOwn ? Alignment.centerRight : Alignment.centerLeft,
                                  child: Container(
                                    margin: const EdgeInsets.symmetric(vertical: 4),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: isOwn ? Colors.purple : Colors.white,
                                      borderRadius: BorderRadius.circular(16),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withOpacity(0.1),
                                          blurRadius: 4,
                                          offset: const Offset(0, 2),
                                        ),
                                      ],
                                    ),
                                    constraints: BoxConstraints(
                                      maxWidth: MediaQuery.of(context).size.width * 0.7,
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          message['senderName'] ?? 'Usuário',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: isOwn ? Colors.white70 : Colors.grey.shade600,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          message['message'] ?? '',
                                          style: TextStyle(
                                            color: isOwn ? Colors.white : Colors.black87,
                                            fontSize: 14,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _messageController,
                              decoration: InputDecoration(
                                hintText: _isChatConnected 
                                    ? 'Digite sua mensagem...' 
                                    : 'Conectando...',
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(24),
                                ),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 8,
                                ),
                              ),
                              enabled: _isChatConnected,
                              onSubmitted: (_) {
                                if (_isChatConnected) {
                                  _sendMessage();
                                }
                              },
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            onPressed: _isChatConnected && _messageController.text.trim().isNotEmpty
                                ? () => _sendMessage()
                                : null,
                            icon: const Icon(Icons.send),
                            color: Colors.purple,
                            disabledColor: Colors.grey,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _getTypeLabel(String type) {
    switch (type) {
      case 'IDENTIFIED':
        return 'Identificado';
      case 'SEMI_IDENTIFIED':
        return 'Semi-identificado';
      case 'ANONYMOUS':
        return 'Anônimo';
      default:
        return type;
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'PENDING':
        return 'Pendente';
      case 'IN_PROGRESS':
        return 'Em Andamento';
      case 'COMPLETED':
        return 'Concluído';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'PENDING':
        return Colors.orange.shade100;
      case 'IN_PROGRESS':
        return Colors.blue.shade100;
      case 'COMPLETED':
        return Colors.green.shade100;
      case 'CANCELLED':
        return Colors.red.shade100;
      default:
        return Colors.grey.shade100;
    }
  }
}

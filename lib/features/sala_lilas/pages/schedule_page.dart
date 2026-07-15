import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../services/sala_lilas_service.dart';
import '../../../core/config/api_config.dart';
import '../../../core/storage/storage_service.dart';
import '../../../core/widgets/app_scaffold.dart';

// Nomes dos dias da semana (0=Dom, 1=Seg, ..., 6=Sáb)
const _kDayShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const _kMonths = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

class SchedulePage extends ConsumerStatefulWidget {
  const SchedulePage({super.key});

  @override
  ConsumerState<SchedulePage> createState() => _SchedulePageState();
}

class _SchedulePageState extends ConsumerState<SchedulePage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  IO.Socket? _eventsSocket;

  // Estado do calendário
  DateTime _focusedMonth = DateTime.now();
  DateTime? _selectedDate;

  // Agendamentos existentes
  List<Map<String, dynamic>> _schedules = [];
  bool _loadingSchedules = true;
  bool _canApproveSchedules = false;

  // Horários de funcionamento
  List<Map<String, dynamic>> _operatingHours = [];

  // Formulário de novo agendamento
  TimeOfDay _selectedTime = const TimeOfDay(hour: 9, minute: 0);
  final _notesController = TextEditingController();
  bool _saving = false;
  String? _selectedServiceType;
  List<Map<String, dynamic>> _serviceTypes = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
    _connectEvents();
  }

  @override
  void dispose() {
    _eventsSocket?.disconnect();
    _eventsSocket?.dispose();
    _eventsSocket = null;
    _tabController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      final service = ref.read(salaLilasServiceProvider);
      final storage = ref.read(storageServiceProvider);
      setState(() => _loadingSchedules = true);

      final results = await Future.wait([
        service.getScheduledAttendances(),
        service.getOperatingHours(),
        service.getServiceTypes(),
      ]);

      var canApprove = false;
      try {
        final token = await storage.getAccessToken();
        canApprove = _canApproveFromToken(token);
      } catch (_) {
        canApprove = false;
      }
      if (mounted) {
        setState(() {
          _schedules = results[0] as List<Map<String, dynamic>>;
          _operatingHours = results[1] as List<Map<String, dynamic>>;
          _serviceTypes = results[2] as List<Map<String, dynamic>>;
          _canApproveSchedules = canApprove;
          _loadingSchedules = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loadingSchedules = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Não foi possível carregar os agendamentos.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _loadSchedulesOnly() async {
    try {
      final service = ref.read(salaLilasServiceProvider);
      final schedules = await service.getScheduledAttendances();
      if (mounted) {
        setState(() {
          _schedules = schedules;
        });
      }
    } catch (_) {}
  }

  Future<void> _connectEvents() async {
    try {
      final storage = ref.read(storageServiceProvider);
      final token = await storage.getAccessToken();
      if (token == null || token.isEmpty) return;

      final wsUrl = ApiConfig.baseUrlWithoutApi;

      _eventsSocket?.disconnect();
      _eventsSocket?.dispose();

      _eventsSocket = IO.io(
        '$wsUrl/sala-lilas-events',
        IO.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .setAuth({'token': token})
            .enableAutoConnect()
            .build(),
      );

      _eventsSocket!.on('schedule-created', (_) => _loadSchedulesOnly());
      _eventsSocket!.on('schedule-updated', (_) => _loadSchedulesOnly());

      _eventsSocket!.onConnect((_) {});
      _eventsSocket!.onDisconnect((_) {});
      _eventsSocket!.onConnectError((_) {});
      _eventsSocket!.onError((_) {});

      _eventsSocket!.connect();
    } catch (_) {}
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  bool _canApproveFromToken(String? token) {
    if (token == null || token.isEmpty) return false;
    final parts = token.split('.');
    if (parts.length < 2) return false;
    try {
      final normalized = base64Url.normalize(parts[1]);
      final payloadJson = utf8.decode(base64Url.decode(normalized));
      final payload = jsonDecode(payloadJson);
      if (payload is! Map) return false;
      final roles = payload['roles'];
      if (roles is List) {
        return roles.contains('ATTENDANT') || roles.contains('ADMIN');
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  bool _isDayOpen(DateTime date) {
    if (_operatingHours.isEmpty) return true; // sem config = sempre aberto
    final dow = date.weekday % 7; // Flutter: Mon=1..Sun=7 → 0=Dom
    final config = _operatingHours.firstWhere(
      (h) => h['dayOfWeek'] == dow,
      orElse: () => {},
    );
    return config.isEmpty ? false : config['isActive'] == true;
  }

  List<Map<String, dynamic>> _schedulesOnDay(DateTime date) {
    return _schedules.where((s) {
      final d = DateTime.parse(s['scheduledFor']).toLocal();
      return d.year == date.year && d.month == date.month && d.day == date.day;
    }).toList();
  }

  String _formatTime(String isoString) {
    final dt = DateTime.parse(isoString).toLocal();
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'PENDING': return 'Pendente';
      case 'APPROVED': return 'Aprovado';
      case 'REJECTED': return 'Rejeitado';
      case 'COMPLETED': return 'Concluído';
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
  }

  String _serviceTypeLabel(String serviceType) {
    final found = _serviceTypes.firstWhere(
      (st) => st['value'] == serviceType,
      orElse: () => {},
    );
    if (found.isNotEmpty) return found['label']?.toString() ?? serviceType;
    // Fallback labels
    const labels = {
      'ASSISTENCIA_SOCIAL': 'Assistência Social',
      'ADVOCACIA': 'Advocacia / Jurídico',
      'PSICOLOGIA': 'Psicologia',
      'NUTRICAO': 'Nutrição',
      'FISIOTERAPIA': 'Fisioterapia',
      'AURICULOTERAPIA': 'Auriculoterapia',
      'TERAPIA_GRUPO': 'Terapia em Grupo',
      'SALAO_BELEZA': 'Salão de Beleza',
      'ATIVIDADE_FISICA': 'Atividade Física',
      'ATIVIDADE_COLETIVA': 'Atividade Coletiva',
      'DEFESA_PESSOAL': 'Defesa Pessoal',
      'CAIMO': 'C.A.I.M.O.',
      'OUTRO': 'Outro',
    };
    return labels[serviceType] ?? serviceType;
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'PENDING': return Colors.orange;
      case 'APPROVED': return Colors.green;
      case 'REJECTED': return Colors.red;
      case 'COMPLETED': return Colors.green;
      case 'CANCELLED': return Colors.red;
      default: return Colors.grey;
    }
  }

  Future<void> _approveSchedule(String scheduleId) async {
    try {
      final service = ref.read(salaLilasServiceProvider);
      await service.approveScheduledAttendance(scheduleId);
      await _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Agendamento aprovado'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Não foi possível aprovar o agendamento.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _rejectSchedule(String scheduleId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rejeitar agendamento?'),
        content: const Text('Essa ação marca o agendamento como rejeitado.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Rejeitar'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final service = ref.read(salaLilasServiceProvider);
      await service.rejectScheduledAttendance(scheduleId);
      await _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Agendamento rejeitado'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Não foi possível rejeitar o agendamento.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // ── Criar agendamento ─────────────────────────────────────────────────────────

  Future<void> _createSchedule() async {
    if (_selectedDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecione uma data no calendário.')),
      );
      return;
    }

    if (!_isDayOpen(_selectedDate!)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('A Sala Lilás não funciona neste dia.'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _saving = true);
    try {
      final storage = ref.read(storageServiceProvider);
      final userId = await storage.getUserId();
      if (userId == null) throw Exception('Usuário não identificado');

      final scheduledFor = DateTime(
        _selectedDate!.year,
        _selectedDate!.month,
        _selectedDate!.day,
        _selectedTime.hour,
        _selectedTime.minute,
      );

      final service = ref.read(salaLilasServiceProvider);
      await service.scheduleAttendance(
        clientId: userId,
        scheduledFor: scheduledFor,
        serviceType: _selectedServiceType,
        notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      );

      _notesController.clear();
      setState(() => _selectedServiceType = null);
      await _loadData();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Agendamento realizado com sucesso!'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );
        // Navegar para a área de agendamento (aba calendário)
        context.go('/schedule');
      }
    } catch (e) {
      if (mounted) {
        // FIX #18: Não expor detalhes internos do backend ao usuário.
        // Mapear erros conhecidos para mensagens amigáveis.
        String userMessage;
        final errorStr = e.toString().toLowerCase();
        if (errorStr.contains('não identificado') || errorStr.contains('unauthorized')) {
          userMessage = 'Sessão expirada. Faça login novamente.';
        } else if (errorStr.contains('não funciona') || errorStr.contains('fechado')) {
          userMessage = 'A Sala Lilás não funciona neste dia ou horário.';
        } else if (errorStr.contains('network') || errorStr.contains('connection')) {
          userMessage = 'Sem conexão com o servidor. Verifique sua internet.';
        } else {
          userMessage = 'Não foi possível realizar o agendamento. Tente novamente.';
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(userMessage),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  // ── Calendário ────────────────────────────────────────────────────────────────

  Widget _buildCalendar() {
    final year = _focusedMonth.year;
    final month = _focusedMonth.month;
    final firstDay = DateTime(year, month, 1).weekday % 7; // 0=Dom
    final daysInMonth = DateTime(year, month + 1, 0).day;
    final today = DateTime.now();
    final todayOnly = DateTime(today.year, today.month, today.day);

    // Agendamentos de hoje em diante, ordenados por data
    final upcomingSchedules = _schedules.where((s) {
      final d = DateTime.parse(s['scheduledFor']).toLocal();
      final dOnly = DateTime(d.year, d.month, d.day);
      return !dOnly.isBefore(todayOnly);
    }).toList()
      ..sort((a, b) => DateTime.parse(a['scheduledFor'])
          .compareTo(DateTime.parse(b['scheduledFor'])));

    // Agrupar por data
    final Map<String, List<Map<String, dynamic>>> grouped = {};
    for (final s in upcomingSchedules) {
      final d = DateTime.parse(s['scheduledFor']).toLocal();
      final key = '${d.year}-${d.month.toString().padLeft(2,'0')}-${d.day.toString().padLeft(2,'0')}';
      grouped.putIfAbsent(key, () => []).add(s);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Mini calendário ──────────────────────────────────────────────────
        Container(
          color: Colors.white,
          padding: const EdgeInsets.only(bottom: 8),
          child: Column(
            children: [
              // Navegação de mês
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.chevron_left),
                      onPressed: () => setState(() {
                        _focusedMonth = DateTime(year, month - 1);
                      }),
                    ),
                    Text(
                      '${_kMonths[month - 1]} $year',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    IconButton(
                      icon: const Icon(Icons.chevron_right),
                      onPressed: () => setState(() {
                        _focusedMonth = DateTime(year, month + 1);
                      }),
                    ),
                  ],
                ),
              ),

              // Cabeçalho dias da semana
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Row(
                  children: _kDayShort.map((d) => Expanded(
                    child: Center(
                      child: Text(d,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey,
                        ),
                      ),
                    ),
                  )).toList(),
                ),
              ),
              const SizedBox(height: 4),

              // Grid de dias
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 7,
                    childAspectRatio: 1,
                  ),
                  itemCount: firstDay + daysInMonth,
                  itemBuilder: (context, index) {
                    if (index < firstDay) return const SizedBox();
                    final day = index - firstDay + 1;
                    final date = DateTime(year, month, day);
                    final isToday = date.year == today.year &&
                        date.month == today.month &&
                        date.day == today.day;
                    final isSelected = _selectedDate != null &&
                        date.year == _selectedDate!.year &&
                        date.month == _selectedDate!.month &&
                        date.day == _selectedDate!.day;
                    final isPast = date.isBefore(todayOnly);
                    final isOpen = _isDayOpen(date);
                    final daySchedules = _schedulesOnDay(date);

                    return GestureDetector(
                      onTap: () => setState(() {
                        _selectedDate = isSelected ? null : date;
                      }),
                      child: Container(
                        margin: const EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? Colors.purple
                              : daySchedules.isNotEmpty
                                  ? Colors.purple.shade100
                                  : isToday
                                      ? Colors.purple.shade50
                                      : null,
                          borderRadius: BorderRadius.circular(8),
                          border: isToday && !isSelected
                              ? Border.all(color: Colors.purple, width: 1.5)
                              : null,
                        ),
                        child: Center(
                          child: Text(
                            '$day',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: isToday || isSelected || daySchedules.isNotEmpty
                                  ? FontWeight.bold
                                  : FontWeight.normal,
                              color: isSelected
                                  ? Colors.white
                                  : isPast
                                      ? Colors.grey.shade300
                                      : !isOpen
                                          ? Colors.grey.shade400
                                          : daySchedules.isNotEmpty
                                              ? Colors.purple.shade700
                                              : Colors.black87,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),

        const Divider(height: 1),

        // ── Lista de agendamentos ────────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
          child: Row(
            children: [
              const Icon(Icons.event_note, color: Colors.purple, size: 18),
              const SizedBox(width: 8),
              Text(
                _selectedDate != null
                    ? '${_selectedDate!.day} de ${_kMonths[_selectedDate!.month - 1]}'
                    : 'Próximos agendamentos',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                  color: Colors.black87,
                ),
              ),
              if (_selectedDate != null) ...[
                const Spacer(),
                GestureDetector(
                  onTap: () => setState(() => _selectedDate = null),
                  child: Text(
                    'Ver todos',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.purple.shade400,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),

        // Agendamentos filtrados
        Builder(builder: (_) {
          // Se há dia selecionado, mostrar só aquele dia
          final List<Map<String, dynamic>> toShow = _selectedDate != null
              ? _schedulesOnDay(_selectedDate!)
              : upcomingSchedules;

          if (toShow.isEmpty) {
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.calendar_today_outlined,
                        size: 40, color: Colors.grey.shade300),
                    const SizedBox(height: 12),
                    Text(
                      _selectedDate != null
                          ? 'Nenhum agendamento neste dia.'
                          : 'Nenhum agendamento futuro.',
                      style: TextStyle(color: Colors.grey.shade500, fontSize: 14),
                    ),
                    const SizedBox(height: 8),
                    TextButton.icon(
                      onPressed: () => _tabController.animateTo(1),
                      icon: const Icon(Icons.add, size: 16),
                      label: const Text('Agendar agora'),
                      style: TextButton.styleFrom(foregroundColor: Colors.purple),
                    ),
                  ],
                ),
              ),
            );
          }

          // Se dia selecionado: lista simples
          if (_selectedDate != null) {
            return Column(
              children: toShow.map((s) => _buildScheduleCard(s)).toList(),
            );
          }

          // Sem dia selecionado: agrupar por data
          final sortedKeys = grouped.keys.toList()..sort();
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: sortedKeys.map((key) {
              final dt = DateTime.parse(key);
              final isToday = dt.year == today.year &&
                  dt.month == today.month &&
                  dt.day == today.day;
              final isTomorrow = dt.year == today.year &&
                  dt.month == today.month &&
                  dt.day == today.day + 1;

              String dateLabel;
              if (isToday) {
                dateLabel = 'Hoje — ${dt.day} de ${_kMonths[dt.month - 1]}';
              } else if (isTomorrow) {
                dateLabel = 'Amanhã — ${dt.day} de ${_kMonths[dt.month - 1]}';
              } else {
                dateLabel =
                    '${_kDayShort[dt.weekday % 7]}, ${dt.day} de ${_kMonths[dt.month - 1]}';
              }

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Cabeçalho do grupo
                  Container(
                    margin: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: isToday
                          ? Colors.purple.shade50
                          : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      dateLabel,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: isToday ? Colors.purple : Colors.grey.shade600,
                      ),
                    ),
                  ),
                  ...grouped[key]!.map((s) => _buildScheduleCard(s)),
                ],
              );
            }).toList(),
          );
        }),

        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildScheduleCard(Map<String, dynamic> s) {
    final status = s['status'] ?? 'PENDING';
    final scheduleId = s['id']?.toString();
    final showActions = _canApproveSchedules && status == 'PENDING' && scheduleId != null && scheduleId.isNotEmpty;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 4, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.purple.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _formatTime(s['scheduledFor']),
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.purple,
                    fontSize: 13,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (s['client'] != null)
                      Text(
                        s['client']['name'] ?? 'Usuária',
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                      ),
                    if (s['serviceType'] != null && s['serviceType'].toString().isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          _serviceTypeLabel(s['serviceType']),
                          style: TextStyle(fontSize: 12, color: Colors.purple.shade600, fontWeight: FontWeight.w500),
                        ),
                      ),
                    if (s['notes'] != null && s['notes'].toString().isNotEmpty)
                      Text(
                        s['notes'],
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: _statusColor(status).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _statusLabel(status),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: _statusColor(status),
                  ),
                ),
              ),
            ],
          ),
          if (showActions) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _rejectSchedule(scheduleId),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                      side: BorderSide(color: Colors.red.shade200),
                    ),
                    child: const Text('Rejeitar'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _approveSchedule(scheduleId),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Aprovar'),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // ── Formulário de agendamento ─────────────────────────────────────────────────

  Widget _buildForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Info
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.purple.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.purple.shade100),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline, color: Colors.purple.shade700, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Agende um atendimento na Sala Lilás Virtual. Nossa equipe entrará em contato para confirmar.',
                    style: TextStyle(fontSize: 13, color: Colors.purple.shade800),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Data
          const Text('Data *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 8),
          InkWell(
            onTap: () async {
              final now = DateTime.now();
              final picked = await showDatePicker(
                context: context,
                initialDate: _selectedDate ?? now,
                firstDate: now,
                lastDate: DateTime(now.year + 1),
                builder: (context, child) => Theme(
                  data: Theme.of(context).copyWith(
                    colorScheme: ColorScheme.light(primary: Colors.purple.shade700),
                  ),
                  child: child!,
                ),
              );
              if (picked != null) setState(() => _selectedDate = picked);
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: BoxDecoration(
                border: Border.all(color: _selectedDate != null ? Colors.purple : Colors.grey.shade300),
                borderRadius: BorderRadius.circular(10),
                color: Colors.white,
              ),
              child: Row(
                children: [
                  Icon(Icons.calendar_today,
                    color: _selectedDate != null ? Colors.purple : Colors.grey,
                    size: 20,
                  ),
                  const SizedBox(width: 10),
                  Text(
                    _selectedDate != null
                        ? '${_selectedDate!.day} de ${_kMonths[_selectedDate!.month - 1]} de ${_selectedDate!.year}'
                        : 'Selecione uma data',
                    style: TextStyle(
                      fontSize: 14,
                      color: _selectedDate != null ? Colors.black87 : Colors.grey,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Aviso se dia fechado
          if (_selectedDate != null && !_isDayOpen(_selectedDate!))
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Row(
                children: [
                  Icon(Icons.warning_amber, color: Colors.orange.shade700, size: 16),
                  const SizedBox(width: 6),
                  Text(
                    'A Sala Lilás não funciona neste dia.',
                    style: TextStyle(color: Colors.orange.shade700, fontSize: 12),
                  ),
                ],
              ),
            ),

          const SizedBox(height: 20),

          // Horário
          const Text('Horário *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 8),
          InkWell(
            onTap: () async {
              final picked = await showTimePicker(
                context: context,
                initialTime: _selectedTime,
                builder: (context, child) => Theme(
                  data: Theme.of(context).copyWith(
                    colorScheme: ColorScheme.light(primary: Colors.purple.shade700),
                  ),
                  child: child!,
                ),
              );
              if (picked != null) setState(() => _selectedTime = picked);
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.purple.shade300),
                borderRadius: BorderRadius.circular(10),
                color: Colors.white,
              ),
              child: Row(
                children: [
                  const Icon(Icons.access_time, color: Colors.purple, size: 20),
                  const SizedBox(width: 10),
                  Text(
                    _selectedTime.format(context),
                    style: const TextStyle(fontSize: 14, color: Colors.black87),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),

          // Tipo de Atendimento
          const Text('Tipo de Atendimento', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              border: Border.all(color: _selectedServiceType != null ? Colors.purple : Colors.grey.shade300),
              borderRadius: BorderRadius.circular(10),
              color: Colors.white,
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedServiceType,
                isExpanded: true,
                hint: Text(
                  'Selecione o serviço desejado...',
                  style: TextStyle(color: Colors.grey.shade500, fontSize: 14),
                ),
                icon: Icon(Icons.arrow_drop_down, color: _selectedServiceType != null ? Colors.purple : Colors.grey),
                items: _serviceTypes.map((st) {
                  return DropdownMenuItem<String>(
                    value: st['value']?.toString(),
                    child: Text(
                      st['label']?.toString() ?? '',
                      style: const TextStyle(fontSize: 14),
                    ),
                  );
                }).toList(),
                onChanged: (value) => setState(() => _selectedServiceType = value),
              ),
            ),
          ),

          const SizedBox(height: 20),

          // Observações
          const Text('Observações (opcional)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 8),
          TextField(
            controller: _notesController,
            maxLines: 3,
            decoration: InputDecoration(
              hintText: 'Descreva brevemente o motivo do agendamento...',
              hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: Colors.purple.shade400, width: 1.5),
              ),
              contentPadding: const EdgeInsets.all(14),
            ),
          ),

          const SizedBox(height: 32),

          // Botão confirmar
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _saving ? null : _createSchedule,
              icon: _saving
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.check_circle_outline),
              label: Text(_saving ? 'Agendando...' : 'Confirmar Agendamento'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.purple,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Build ─────────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: '📅 Agendar Atendimento',
      showBackButton: true,
      onBack: () => context.go('/home'),
      body: Column(
        children: [
          // Tabs
          Container(
            color: Colors.white,
            child: TabBar(
              controller: _tabController,
              labelColor: Colors.purple,
              unselectedLabelColor: Colors.grey,
              indicatorColor: Colors.purple,
              tabs: const [
                Tab(icon: Icon(Icons.calendar_month), text: 'Calendário'),
                Tab(icon: Icon(Icons.add_circle_outline), text: 'Novo Agendamento'),
              ],
            ),
          ),

          // Conteúdo
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // Aba 1: Calendário
                _loadingSchedules
                    ? const Center(child: CircularProgressIndicator())
                    : RefreshIndicator(
                        onRefresh: _loadData,
                        child: SingleChildScrollView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          child: _buildCalendar(),
                        ),
                      ),

                // Aba 2: Formulário
                _buildForm(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../services/sala_lilas_service.dart';
import '../../../core/widgets/app_scaffold.dart';

class SalaLilasPage extends ConsumerStatefulWidget {
  const SalaLilasPage({super.key});

  @override
  ConsumerState<SalaLilasPage> createState() => _SalaLilasPageState();
}

class _SalaLilasPageState extends ConsumerState<SalaLilasPage> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _activeAttendances = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadAttendances();
  }

  Future<void> _loadAttendances() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final service = ref.read(salaLilasServiceProvider);
      final attendances = await service.getActiveAttendances();
      setState(() {
        _activeAttendances = attendances;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _createAttendance(String type) async {
    try {
      final service = ref.read(salaLilasServiceProvider);
      final attendance = await service.createAttendance(type: type);
      
      if (mounted) {
        context.push('/sala-lilas/attendance/${attendance['id']}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao criar atendimento: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showCreateAttendanceDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Novo Atendimento'),
        content: const Text(
          'Escolha o tipo de atendimento:\n\n'
          '• Identificado: Você fornecerá seus dados\n'
          '• Semi-identificado: Alguns dados serão fornecidos\n'
          '• Anônimo: Nenhum dado pessoal será solicitado',
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _createAttendance('IDENTIFIED');
            },
            child: const Text('Identificado'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _createAttendance('SEMI_IDENTIFIED');
            },
            child: const Text('Semi-identificado'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _createAttendance('ANONYMOUS');
            },
            style: TextButton.styleFrom(
              foregroundColor: Colors.purple,
            ),
            child: const Text(
              'Anônimo',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showBackButton: true,
      title: '💜 Sala Lilás Virtual',
      body: RefreshIndicator(
        onRefresh: _loadAttendances,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Card informativo
              Card(
                color: Colors.purple.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.info_outline, color: Colors.purple),
                          const SizedBox(width: 8),
                          const Text(
                            'Sala Lilás Virtual',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.purple,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Ambiente digital seguro de acolhimento, destinado ao atendimento humanizado de mulheres em situação de violência.',
                        style: TextStyle(fontSize: 14),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              // Botão para criar novo atendimento
              ElevatedButton.icon(
                onPressed: _showCreateAttendanceDialog,
                icon: const Icon(Icons.add_circle_outline),
                label: const Text(
                  'Iniciar Novo Atendimento',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.purple,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              // Lista de atendimentos ativos
              if (_isLoading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(32.0),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (_error != null)
                Card(
                  color: Colors.red.shade50,
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      children: [
                        const Icon(Icons.error_outline, color: Colors.red),
                        const SizedBox(height: 8),
                        Text(
                          'Erro ao carregar atendimentos',
                          style: TextStyle(color: Colors.red.shade700),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _error!,
                          style: TextStyle(
                            color: Colors.red.shade600,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              else if (_activeAttendances.isEmpty)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(32.0),
                    child: Column(
                      children: [
                        Icon(
                          Icons.chat_bubble_outline,
                          size: 64,
                          color: Colors.grey.shade400,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Nenhum atendimento ativo',
                          style: TextStyle(
                            fontSize: 16,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Clique no botão acima para iniciar um novo atendimento',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade500,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              else
                ..._activeAttendances.map((attendance) {
                  final status = attendance['status'] as String? ?? 'PENDING';
                  final type = attendance['type'] as String? ?? 'ANONYMOUS';
                  final createdAt = attendance['createdAt'] as String?;

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Colors.purple.shade100,
                        child: const Icon(Icons.chat, color: Colors.purple),
                      ),
                      title: Text(
                        'Atendimento ${attendance['id']?.toString().substring(0, 8) ?? 'N/A'}',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 4),
                          Text(
                            _getTypeLabel(type),
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade600,
                            ),
                          ),
                          if (createdAt != null)
                            Text(
                              'Criado em ${_formatDate(createdAt)}',
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.grey.shade500,
                              ),
                            ),
                        ],
                      ),
                      trailing: Chip(
                        label: Text(
                          _getStatusLabel(status),
                          style: const TextStyle(fontSize: 11),
                        ),
                        backgroundColor: _getStatusColor(status),
                        padding: EdgeInsets.zero,
                      ),
                      onTap: () {
                        context.push('/sala-lilas/attendance/${attendance['id']}');
                      },
                    ),
                  );
                }),
            ],
          ),
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

  String _formatDate(String dateString) {
    try {
      final date = DateTime.parse(dateString);
      return '${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return dateString;
    }
  }
}


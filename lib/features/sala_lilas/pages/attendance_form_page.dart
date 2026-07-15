import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../services/sala_lilas_service.dart';
import '../../../core/widgets/app_scaffold.dart';

class AttendanceFormPage extends ConsumerStatefulWidget {
  final String attendanceId;

  const AttendanceFormPage({
    super.key,
    required this.attendanceId,
  });

  @override
  ConsumerState<AttendanceFormPage> createState() => _AttendanceFormPageState();
}

class _AttendanceFormPageState extends ConsumerState<AttendanceFormPage> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  bool _isComplete = false;

  // Campos do formulário (progressivos e não invasivos)
  final Map<String, TextEditingController> _controllers = {
    'como_voce_esta': TextEditingController(),
    'precisa_de_ajuda': TextEditingController(),
    'observacoes': TextEditingController(),
  };

  @override
  void dispose() {
    for (var controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _saveForm({bool markComplete = false}) async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final service = ref.read(salaLilasServiceProvider);
      
      // Coletar dados do formulário
      final formData = <String, dynamic>{};
      for (var entry in _controllers.entries) {
        if (entry.value.text.isNotEmpty) {
          formData[entry.key] = entry.value.text;
        }
      }

      await service.saveForm(
        attendanceId: widget.attendanceId,
        formData: formData,
        isComplete: markComplete,
      );

      if (!mounted) return;

      setState(() {
        _isLoading = false;
        _isComplete = markComplete;
      });

      if (markComplete) {
        // Navegar para a página do atendimento após concluir
        context.go('/sala-lilas/attendance/${widget.attendanceId}');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Formulário salvo com sucesso!'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erro ao salvar formulário: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showBackButton: true,
      title: 'Formulário de Acolhimento',
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Card(
                color: Colors.purple.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.info_outline, color: Colors.purple.shade700),
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
                      const SizedBox(height: 8),
                      const Text(
                        'Preencha o formulário no seu ritmo. Você pode salvar e continuar depois.',
                        style: TextStyle(fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Pergunta 1: Como você está?
              TextFormField(
                controller: _controllers['como_voce_esta'],
                decoration: const InputDecoration(
                  labelText: 'Como você está se sentindo hoje?',
                  hintText: 'Conte-nos como você está...',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.sentiment_satisfied),
                ),
                maxLines: 3,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Por favor, preencha este campo';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Pergunta 2: Precisa de ajuda?
              TextFormField(
                controller: _controllers['precisa_de_ajuda'],
                decoration: const InputDecoration(
                  labelText: 'Como podemos ajudá-la?',
                  hintText: 'Descreva como podemos ajudá-la...',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.help_outline),
                ),
                maxLines: 4,
              ),
              const SizedBox(height: 16),

              // Pergunta 3: Observações adicionais
              TextFormField(
                controller: _controllers['observacoes'],
                decoration: const InputDecoration(
                  labelText: 'Observações adicionais (opcional)',
                  hintText: 'Alguma informação adicional que gostaria de compartilhar?',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.note_outlined),
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 32),

              // Botões de ação
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _isLoading
                          ? null
                          : () => _saveForm(markComplete: false),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Salvar Rascunho'),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _isLoading
                          ? null
                          : () => _saveForm(markComplete: true),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.purple,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: const Text('Salvar e Concluir'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}


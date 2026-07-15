import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/widgets/app_scaffold.dart';

class RequestMerchantPage extends ConsumerStatefulWidget {
  const RequestMerchantPage({super.key});

  @override
  ConsumerState<RequestMerchantPage> createState() => _RequestMerchantPageState();
}

class _RequestMerchantPageState extends ConsumerState<RequestMerchantPage> {
  final _formKey = GlobalKey<FormState>();
  final _businessNameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  
  bool _isLoading = false;
  bool _hasRequest = false;
  Map<String, dynamic>? _currentRequest;

  @override
  void initState() {
    super.initState();
    _checkExistingRequest();
  }

  @override
  void dispose() {
    _businessNameController.dispose();
    _descriptionController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    super.dispose();
  }

  Future<void> _checkExistingRequest() async {
    try {
      final dioClient = ref.read(dioClientProvider);
      final response = await dioClient.dio.get('/merchant-requests/me');
      
      if (response.data != null) {
        final data = response.data['data'] ?? response.data;
        if (data != null && data is Map && data.containsKey('id')) {
          setState(() {
            _hasRequest = true;
            _currentRequest = Map<String, dynamic>.from(data);
            _businessNameController.text = _currentRequest!['businessName'] ?? '';
            _descriptionController.text = _currentRequest!['description'] ?? '';
            _phoneController.text = _currentRequest!['phone'] ?? '';
            _emailController.text = _currentRequest!['email'] ?? '';
            _addressController.text = _currentRequest!['address'] ?? '';
            _cityController.text = _currentRequest!['city'] ?? '';
          });
        } else {
          setState(() {
            _hasRequest = false;
            _currentRequest = null;
          });
        }
      } else {
        setState(() {
          _hasRequest = false;
          _currentRequest = null;
        });
      }
    } on DioException catch (e) {
      // 404 significa que não tem solicitação
      if (e.response?.statusCode == 404) {
        setState(() {
          _hasRequest = false;
          _currentRequest = null;
        });
      }
    } catch (e) {
      // Não tem solicitação ainda ou erro
      setState(() {
        _hasRequest = false;
        _currentRequest = null;
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final dioClient = ref.read(dioClientProvider);
      final isRejected = _hasRequest && _currentRequest?['status'] == 'REJECTED';

      if (isRejected) {
        // Atualizar solicitação rejeitada
        await dioClient.dio.patch('/merchant-requests/me', data: {
          'businessName': _businessNameController.text.trim(),
          'description': _descriptionController.text.trim().isEmpty ? null : _descriptionController.text.trim(),
          'phone': _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
          'email': _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
          'address': _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
          'city': _cityController.text.trim().isEmpty ? null : _cityController.text.trim(),
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Solicitação reenviada com sucesso! Aguarde a aprovação.'),
              backgroundColor: Colors.green,
            ),
          );
          await _checkExistingRequest();
          setState(() {}); // Force rebuild
        }
      } else if (_hasRequest) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Você já possui uma solicitação. Aguarde a aprovação.'),
              backgroundColor: Colors.orange,
            ),
          );
        }
      } else {
        // Criar nova solicitação
        await dioClient.dio.post('/merchant-requests', data: {
          'businessName': _businessNameController.text.trim(),
          'description': _descriptionController.text.trim().isEmpty ? null : _descriptionController.text.trim(),
          'phone': _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
          'email': _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
          'address': _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
          'city': _cityController.text.trim().isEmpty ? null : _cityController.text.trim(),
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Solicitação enviada com sucesso! Aguarde a aprovação.'),
              backgroundColor: Colors.green,
            ),
          );
          await _checkExistingRequest();
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _getStatusLabel(String? status) {
    switch (status) {
      case 'PENDING':
        return 'Pendente';
      case 'APPROVED':
        return 'Aprovada';
      case 'REJECTED':
        return 'Rejeitada';
      default:
        return 'Desconhecido';
    }
  }

  Color _getStatusColor(String? status) {
    switch (status) {
      case 'PENDING':
        return Colors.orange;
      case 'APPROVED':
        return Colors.green;
      case 'REJECTED':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showBackButton: true,
      title: 'Solicitar ser Empreendedora',
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_hasRequest && _currentRequest != null) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: _getStatusColor(_currentRequest!['status']).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: _getStatusColor(_currentRequest!['status']),
                        width: 2,
                      ),
                    ),
                    child: Column(
                      children: [
                        Text(
                          'Status da Solicitação',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: _getStatusColor(_currentRequest!['status']),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _getStatusLabel(_currentRequest!['status']),
                          style: TextStyle(
                            fontSize: 16,
                            color: _getStatusColor(_currentRequest!['status']),
                          ),
                        ),
                        if (_currentRequest!['status'] == 'REJECTED' && 
                            _currentRequest!['rejectionReason'] != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            'Motivo: ${_currentRequest!['rejectionReason']}',
                            style: const TextStyle(fontSize: 14),
                          ),
                        ],
                        if (_currentRequest!['status'] == 'APPROVED') ...[
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: () => context.go('/marketplace/my-store'),
                            child: const Text('Gerenciar Minha Loja'),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
                const Text(
                  'Preencha os dados da sua loja',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 24),
                TextFormField(
                  controller: _businessNameController,
                  decoration: const InputDecoration(
                    labelText: 'Nome da Loja *',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.store),
                  ),
                  enabled: !_hasRequest || _currentRequest?['status'] == 'REJECTED',
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Nome da loja é obrigatório';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _descriptionController,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Descrição (opcional)',
                    border: OutlineInputBorder(),
                    hintText: 'Descreva sua loja...',
                  ),
                  enabled: !_hasRequest || _currentRequest?['status'] == 'REJECTED',
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _phoneController,
                  decoration: const InputDecoration(
                    labelText: 'Telefone (opcional)',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.phone),
                  ),
                  keyboardType: TextInputType.phone,
                  enabled: !_hasRequest || _currentRequest?['status'] == 'REJECTED',
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _emailController,
                  decoration: const InputDecoration(
                    labelText: 'Email (opcional)',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.email),
                  ),
                  keyboardType: TextInputType.emailAddress,
                  enabled: !_hasRequest || _currentRequest?['status'] == 'REJECTED',
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _addressController,
                  decoration: const InputDecoration(
                    labelText: 'Endereço (opcional)',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.location_on),
                  ),
                  enabled: !_hasRequest || _currentRequest?['status'] == 'REJECTED',
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _cityController,
                  decoration: const InputDecoration(
                    labelText: 'Cidade (opcional)',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.location_city),
                  ),
                  enabled: !_hasRequest || _currentRequest?['status'] == 'REJECTED',
                ),
                const SizedBox(height: 32),
                if (!_hasRequest || (_currentRequest?['status'] == 'REJECTED'))
                  ElevatedButton(
                    onPressed: _isLoading ? null : _handleSubmit,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: _isLoading
                        ? const CircularProgressIndicator()
                        : Text(
                            _hasRequest && _currentRequest?['status'] == 'REJECTED'
                                ? 'Reenviar Solicitação'
                                : 'Enviar Solicitação',
                            style: const TextStyle(fontSize: 16),
                          ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}




import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/utils/geolocation_service.dart';
import '../../../core/widgets/app_scaffold.dart';

class IncidentFormPage extends ConsumerStatefulWidget {
  const IncidentFormPage({super.key});

  @override
  ConsumerState<IncidentFormPage> createState() => _IncidentFormPageState();
}

class _IncidentFormPageState extends ConsumerState<IncidentFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();
  String? _selectedType;
  bool _isLoading = false;
  bool _isSendingLocation = false;
  bool _isGettingLocation = false;
  String? _locationStatus;
  Timer? _locationTimer;
  String? _incidentId;
  double? _initialLat;
  double? _initialLng;
  double? _initialAccuracy;

  final List<Map<String, String>> _incidentTypes = [
    {'value': 'VIOLENCE', 'label': 'Violência'},
    {'value': 'HARASSMENT', 'label': 'Assédio'},
    {'value': 'THREAT', 'label': 'Ameaça'},
    {'value': 'OTHER', 'label': 'Outro'},
  ];

  @override
  void dispose() {
    _descriptionController.dispose();
    _locationTimer?.cancel();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate() || _selectedType == null) {
      return;
    }

    setState(() {
      _isLoading = true;
      _isGettingLocation = true;
      _locationStatus = 'Obtendo localização...';
    });

    // Capturar localização inicial antes de criar a denúncia
    try {
      final geolocationService = GeolocationService();
      final position = await geolocationService.getCurrentPosition();
      
      setState(() {
        _initialLat = position.latitude;
        _initialLng = position.longitude;
        _initialAccuracy = position.accuracy;
        _locationStatus = 'Localização obtida';
      });
    } catch (e) {
      // Se não conseguir obter localização, continua sem ela
      setState(() {
        _locationStatus = 'Localização não disponível';
        _initialLat = null;
        _initialLng = null;
        _initialAccuracy = null;
      });
      print('⚠️ Erro ao obter localização inicial: $e');
    } finally {
      setState(() => _isGettingLocation = false);
    }

    try {
      final dioClient = ref.read(dioClientProvider);
      
      // Preparar dados da denúncia incluindo localização se disponível
      final incidentData = {
        'type': _selectedType,
        'description': _descriptionController.text.trim(),
        if (_initialLat != null && _initialLng != null) ...{
          'lat': _initialLat,
          'lng': _initialLng,
          if (_initialAccuracy != null) 'accuracy': _initialAccuracy,
        },
      };

      final response = await dioClient.dio.post(
        '/incidents',
        data: incidentData,
      );

      // Extrair dados da resposta
      dynamic incident;
      if (response.data is Map<String, dynamic>) {
        final dataMap = response.data as Map<String, dynamic>;
        incident = dataMap.containsKey('data') ? dataMap['data'] : dataMap;
      } else {
        incident = response.data;
      }

      if (incident is Map && incident.containsKey('id')) {
        _incidentId = incident['id']?.toString();
      } else {
        throw Exception('ID da denúncia não encontrado na resposta');
      }

      // Iniciar envio periódico de localização por 60 segundos
      _startLocationStream();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_initialLat != null 
              ? 'Denúncia registrada com sucesso. Localização sendo rastreada.'
              : 'Denúncia registrada com sucesso.'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 3),
          ),
        );
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) {
            context.pop();
          }
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao registrar denúncia: ${e.toString()}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _startLocationStream() {
    if (_incidentId == null) return;

    setState(() => _isSendingLocation = true);

    final geolocationService = GeolocationService();
    int secondsElapsed = 0;
    const duration = 60; // 60 segundos

    _locationTimer = Timer.periodic(const Duration(seconds: 5), (timer) async {
      if (secondsElapsed >= duration) {
        timer.cancel();
        if (mounted) {
          setState(() => _isSendingLocation = false);
        }
        return;
      }

      try {
        final position = await geolocationService.getCurrentPosition();
        final dioClient = ref.read(dioClientProvider);
        await dioClient.dio.post(
          '/incidents/$_incidentId/locations',
          data: {
            'lat': position.latitude,
            'lng': position.longitude,
            'accuracy': position.accuracy,
          },
        );
        secondsElapsed += 5;
      } catch (e) {
        // Ignorar erros de localização
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showBackButton: true,
      title: 'Registrar Denúncia',
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Preencha os dados da denúncia',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 24),
                DropdownButtonFormField<String>(
                  value: _selectedType,
                  decoration: const InputDecoration(
                    labelText: 'Tipo de incidente',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.category),
                  ),
                  items: _incidentTypes.map((type) {
                    return DropdownMenuItem(
                      value: type['value'],
                      child: Text(type['label']!),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setState(() => _selectedType = value);
                  },
                  validator: (value) {
                    if (value == null) {
                      return 'Selecione o tipo de incidente';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _descriptionController,
                  maxLines: 5,
                  decoration: const InputDecoration(
                    labelText: 'Descrição (opcional)',
                    border: OutlineInputBorder(),
                    hintText: 'Descreva o incidente...',
                  ),
                ),
                if (_isGettingLocation) ...[
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _locationStatus ?? 'Obtendo localização...',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.blue,
                        ),
                      ),
                    ],
                  ),
                ],
                if (_isSendingLocation) ...[
                  const SizedBox(height: 16),
                  const LinearProgressIndicator(),
                  const SizedBox(height: 8),
                  const Text(
                    'Rastreando localização...',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
                if (_initialLat != null && _initialLng != null && !_isLoading && !_isSendingLocation) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.green.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.green.shade200),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.location_on, color: Colors.green, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Localização capturada',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.green.shade700,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: _isLoading ? null : _handleSubmit,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: _isLoading
                      ? const CircularProgressIndicator()
                      : const Text('Registrar Denúncia', style: TextStyle(fontSize: 16)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}



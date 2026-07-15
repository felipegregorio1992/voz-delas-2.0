import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart' as url_launcher;
import '../../../core/network/dio_client.dart';
import '../../../core/widgets/app_scaffold.dart';

class SupportNetworkPage extends ConsumerStatefulWidget {
  const SupportNetworkPage({super.key});

  @override
  ConsumerState<SupportNetworkPage> createState() => _SupportNetworkPageState();
}

class _SupportNetworkPageState extends ConsumerState<SupportNetworkPage> {
  List<dynamic> _services = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadServices();
  }

  Future<void> _loadServices() async {
    setState(() => _isLoading = true);
    try {
      final dioClient = ref.read(dioClientProvider);
      final response = await dioClient.dio.get('/support-services/public');
      setState(() {
        _services = response.data['data'] ?? [];
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao carregar serviços: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _callPhone(String? phone) async {
    if (phone == null || phone.isEmpty) return;

    final uri = Uri.parse('tel:$phone');
    if (await url_launcher.canLaunchUrl(uri)) {
      await url_launcher.launchUrl(uri);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Não foi possível fazer a ligação'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _getTypeLabel(String? type) {
    switch (type) {
      case 'CEAM':
        return 'CEAM';
      case 'DEAM':
        return 'DEAM';
      case 'DEFENSORIA':
        return 'Defensoria';
      case 'OUTRO':
        return 'Outro';
      default:
        return type ?? 'Serviço';
    }
  }

  IconData _getTypeIcon(String? type) {
    switch (type) {
      case 'CEAM':
        return Icons.support_agent;
      case 'DEAM':
        return Icons.gavel;
      case 'DEFENSORIA':
        return Icons.balance;
      default:
        return Icons.info;
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showBackButton: true,
      title: 'Rede de Apoio',
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _services.isEmpty
              ? const Center(
                  child: Text('Nenhum serviço disponível'),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _services.length,
                  itemBuilder: (context, index) {
                    final service = _services[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 16),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  _getTypeIcon(service['type']),
                                  color: Theme.of(context).primaryColor,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _getTypeLabel(service['type']),
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Theme.of(context).primaryColor,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              service['name'] ?? '',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (service['address'] != null) ...[
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  const Icon(Icons.location_on, size: 16, color: Colors.grey),
                                  const SizedBox(width: 4),
                                  Expanded(
                                    child: Text(
                                      service['address'],
                                      style: const TextStyle(color: Colors.grey),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                            if (service['phone'] != null) ...[
                              const SizedBox(height: 8),
                              InkWell(
                                onTap: () => _callPhone(service['phone']),
                                child: Row(
                                  children: [
                                    const Icon(Icons.phone, size: 16, color: Colors.blue),
                                    const SizedBox(width: 4),
                                    Text(
                                      service['phone'],
                                      style: const TextStyle(
                                        color: Colors.blue,
                                        decoration: TextDecoration.underline,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                            if (service['hours'] != null) ...[
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  const Icon(Icons.access_time, size: 16, color: Colors.grey),
                                  const SizedBox(width: 4),
                                  Expanded(
                                    child: Text(
                                      service['hours'],
                                      style: const TextStyle(color: Colors.grey),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                            if (service['city'] != null) ...[
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  const Icon(Icons.location_city, size: 16, color: Colors.grey),
                                  const SizedBox(width: 4),
                                  Expanded(
                                    child: Text(
                                      service['city'],
                                      style: const TextStyle(color: Colors.grey),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}



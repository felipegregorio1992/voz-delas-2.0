import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart' as url_launcher;

/// Página de Rede de Apoio offline — não precisa de login nem conexão com o backend.
class EmergencyNetworkPage extends StatelessWidget {
  const EmergencyNetworkPage({super.key});

  Future<void> _callPhone(BuildContext context, String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await url_launcher.canLaunchUrl(uri)) {
      await url_launcher.launchUrl(uri);
    } else {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Não foi possível fazer a ligação'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Rede de Apoio'),
        backgroundColor: const Color(0xFF6A0DAD),
        foregroundColor: Colors.white,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildServiceCard(
            context,
            type: 'Emergência',
            name: 'Polícia Militar',
            address: 'Emergência imediata',
            hours: '24 horas',
            phone: '190',
          ),
          _buildServiceCard(
            context,
            type: 'Emergência',
            name: 'Central de Atendimento à Mulher',
            address: 'Gratuito e confidencial',
            hours: '24 horas',
            phone: '180',
          ),
          _buildServiceCard(
            context,
            type: 'Emergência',
            name: 'SAMU',
            address: 'Emergência médica',
            hours: '24 horas',
            phone: '192',
          ),
          _buildServiceCard(
            context,
            type: 'CEAM',
            name: 'Casa da Mulher de Maricá',
            address: 'Maricá - RJ',
            hours: 'Seg a Sex: 08h às 17h | Emergência: 24h',
            phone: '(21) 99107-9691',
          ),
          _buildServiceCard(
            context,
            type: 'DEAM',
            name: '82ª Delegacia de Polícia (Maricá)',
            address: 'Maricá - RJ',
            hours: '24 horas',
            phone: null,
          ),
          _buildServiceCard(
            context,
            type: 'Segurança',
            name: 'Grupamento Maria da Penha (GMAP)',
            address: 'Guarda Municipal de Maricá',
            hours: '24 horas',
            phone: null,
          ),
          _buildServiceCard(
            context,
            type: 'Defensoria',
            name: 'Defensoria Pública',
            address: 'Maricá - RJ',
            hours: 'Atendimento jurídico gratuito',
            phone: null,
          ),
        ],
      ),
    );
  }

  Widget _buildServiceCard(
    BuildContext context, {
    required String type,
    required String name,
    required String address,
    required String hours,
    String? phone,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFF6A0DAD).withAlpha(25),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                type,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF6A0DAD),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.location_on, size: 14, color: Colors.grey),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(address, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.access_time, size: 14, color: Colors.grey),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(hours, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ),
              ],
            ),
            if (phone != null) ...[
              const SizedBox(height: 8),
              InkWell(
                onTap: () => _callPhone(context, phone.replaceAll(RegExp(r'[^\d+]'), '')),
                child: Row(
                  children: [
                    const Icon(Icons.phone, size: 14, color: Colors.blue),
                    const SizedBox(width: 4),
                    Text(
                      phone,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Colors.blue,
                        decoration: TextDecoration.underline,
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
}

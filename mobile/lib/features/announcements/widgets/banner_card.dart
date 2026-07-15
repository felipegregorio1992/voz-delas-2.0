import 'package:flutter/material.dart';
import '../models/announcement.dart';
import '../../../core/config/api_config.dart';

class BannerCard extends StatelessWidget {
  final Announcement banner;

  const BannerCard({
    super.key,
    required this.banner,
  });

  String _buildImageUrl(String relativeUrl) {
    // Se já é uma URL completa, retornar como está
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
      return relativeUrl;
    }
    // Construir URL completa a partir da base do backend
    final baseUrl = ApiConfig.baseUrlWithoutApi;
    return '$baseUrl$relativeUrl';
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Imagem do banner (se houver)
          if (banner.imageUrl != null && banner.imageUrl!.isNotEmpty)
            Image.network(
              _buildImageUrl(banner.imageUrl!),
              height: 140,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                height: 80,
                color: Colors.purple.shade50,
                child: Center(
                  child: Icon(Icons.image, color: Colors.purple.shade200, size: 32),
                ),
              ),
            ),

          // Conteúdo do banner
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        'NOVIDADE',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.blue.shade700,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  banner.title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (banner.content != null && banner.content!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    banner.content!,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade600,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/announcement.dart';
import '../../../core/config/api_config.dart';

class NoticeDialog extends StatelessWidget {
  final Announcement notice;
  final VoidCallback onClose;
  final VoidCallback onDismissPermanently;

  const NoticeDialog({
    super.key,
    required this.notice,
    required this.onClose,
    required this.onDismissPermanently,
  });

  String _buildImageUrl(String relativeUrl) {
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
      return relativeUrl;
    }
    final baseUrl = ApiConfig.baseUrlWithoutApi;
    return '$baseUrl$relativeUrl';
  }

  Future<void> _openLink() async {
    if (notice.linkUrl == null || notice.linkUrl!.isEmpty) return;
    final uri = Uri.parse(notice.linkUrl!);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Ícone de aviso
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.campaign_rounded,
                size: 40,
                color: Colors.orange.shade700,
              ),
            ),
            const SizedBox(height: 16),

            // Título
            Text(
              notice.title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),

            // Conteúdo
            if (notice.content != null && notice.content!.isNotEmpty) ...[
              Text(
                notice.content!,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey.shade700,
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
            ],

            // Imagem (clicável se tiver link)
            if (notice.imageUrl != null && notice.imageUrl!.isNotEmpty) ...[
              const SizedBox(height: 8),
              GestureDetector(
                onTap: notice.hasLink ? _openLink : null,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Stack(
                    children: [
                      Image.network(
                        _buildImageUrl(notice.imageUrl!),
                        height: 150,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                      ),
                      // Indicador de link na imagem
                      if (notice.hasLink)
                        Positioned(
                          bottom: 6,
                          right: 6,
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.6),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Icon(
                              Icons.open_in_new,
                              color: Colors.white,
                              size: 16,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 8),
            ],

            // Se tem link mas não tem imagem, mostrar texto clicável
            if (notice.hasLink && (notice.imageUrl == null || notice.imageUrl!.isEmpty)) ...[
              const SizedBox(height: 4),
              GestureDetector(
                onTap: _openLink,
                child: Text(
                  'Toque para saber mais →',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.purple.shade700,
                    fontWeight: FontWeight.w600,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
              const SizedBox(height: 8),
            ],

            const SizedBox(height: 20),

            // Botões
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Botão Fechar
                ElevatedButton(
                  onPressed: onClose,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.purple,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Text(
                    'Fechar',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(height: 8),

                // Botão Não mostrar mais
                TextButton(
                  onPressed: onDismissPermanently,
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.grey.shade600,
                  ),
                  child: const Text(
                    'Não mostrar novamente',
                    style: TextStyle(fontSize: 13),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

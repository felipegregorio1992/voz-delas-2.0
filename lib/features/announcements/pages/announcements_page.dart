import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../models/announcement.dart';
import '../services/announcements_service.dart';

class AnnouncementsPage extends ConsumerStatefulWidget {
  const AnnouncementsPage({super.key});

  @override
  ConsumerState<AnnouncementsPage> createState() => _AnnouncementsPageState();
}

class _AnnouncementsPageState extends ConsumerState<AnnouncementsPage> {
  List<Announcement> _announcements = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadAnnouncements();
  }

  Future<void> _loadAnnouncements() async {
    setState(() => _loading = true);
    try {
      final service = ref.read(announcementsServiceProvider);
      final announcements = await service.getActiveAnnouncements();
      if (mounted) {
        setState(() {
          _announcements = announcements;
          _loading = false;
        });
        // Marcar todos os não lidos como lidos automaticamente ao abrir a página
        _dismissAllUnread(announcements);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _dismissAllUnread(List<Announcement> announcements) async {
    final service = ref.read(announcementsServiceProvider);
    final unread = announcements.where((a) => !a.dismissed).toList();
    for (final announcement in unread) {
      await service.dismissAnnouncement(announcement.id);
    }
    if (mounted && unread.isNotEmpty) {
      setState(() {
        _announcements = _announcements.map((a) {
          if (!a.dismissed) {
            return Announcement(
              id: a.id,
              title: a.title,
              content: a.content,
              imageUrl: a.imageUrl,
              linkUrl: a.linkUrl,
              type: a.type,
              isActive: a.isActive,
              startDate: a.startDate,
              endDate: a.endDate,
              createdAt: a.createdAt,
              dismissed: true,
            );
          }
          return a;
        }).toList();
      });
    }
  }

  Future<void> _dismissAnnouncement(Announcement announcement) async {
    final service = ref.read(announcementsServiceProvider);
    await service.dismissAnnouncement(announcement.id);
    setState(() {
      final index = _announcements.indexWhere((a) => a.id == announcement.id);
      if (index != -1) {
        _announcements[index] = Announcement(
          id: announcement.id,
          title: announcement.title,
          content: announcement.content,
          imageUrl: announcement.imageUrl,
          linkUrl: announcement.linkUrl,
          type: announcement.type,
          isActive: announcement.isActive,
          startDate: announcement.startDate,
          endDate: announcement.endDate,
          createdAt: announcement.createdAt,
          dismissed: true,
        );
      }
    });
  }

  Future<void> _openLink(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Avisos',
      showBackButton: true,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadAnnouncements,
              child: _announcements.isEmpty
                  ? ListView(
                      children: const [
                        SizedBox(height: 100),
                        Center(
                          child: Column(
                            children: [
                              Icon(Icons.notifications_off_outlined,
                                  size: 64, color: Colors.grey),
                              SizedBox(height: 16),
                              Text(
                                'Nenhum aviso no momento',
                                style: TextStyle(
                                  fontSize: 16,
                                  color: Colors.grey,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _announcements.length,
                      itemBuilder: (context, index) {
                        final announcement = _announcements[index];
                        return _buildAnnouncementCard(announcement);
                      },
                    ),
            ),
    );
  }

  Widget _buildAnnouncementCard(Announcement announcement) {
    final isDismissed = announcement.dismissed;
    final isBanner = announcement.isBanner;

    return Card(
      elevation: isDismissed ? 1 : 3,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      color: isDismissed ? Colors.grey.shade50 : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Imagem do banner
          if (announcement.imageUrl != null && announcement.imageUrl!.isNotEmpty)
            ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(12)),
              child: Image.network(
                announcement.imageUrl!,
                width: double.infinity,
                height: 150,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const SizedBox.shrink(),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header com tipo e status
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: isBanner
                            ? Colors.blue.shade100
                            : Colors.orange.shade100,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        isBanner ? 'Banner' : 'Aviso',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: isBanner
                              ? Colors.blue.shade800
                              : Colors.orange.shade800,
                        ),
                      ),
                    ),
                    const Spacer(),
                    if (!isDismissed)
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                        ),
                      ),
                    if (isDismissed)
                      const Icon(Icons.check_circle,
                          size: 16, color: Colors.grey),
                  ],
                ),
                const SizedBox(height: 8),
                // Título
                Text(
                  announcement.title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: isDismissed ? Colors.grey : Colors.black87,
                  ),
                ),
                // Conteúdo
                if (announcement.content != null &&
                    announcement.content!.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    announcement.content!,
                    style: TextStyle(
                      fontSize: 14,
                      color: isDismissed ? Colors.grey : Colors.black54,
                    ),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 12),
                // Ações
                Row(
                  children: [
                    // Data
                    Text(
                      _formatDate(announcement.createdAt),
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.grey,
                      ),
                    ),
                    const Spacer(),
                    // Link
                    if (announcement.hasLink)
                      TextButton.icon(
                        onPressed: () => _openLink(announcement.linkUrl!),
                        icon: const Icon(Icons.open_in_new, size: 16),
                        label: const Text('Abrir'),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.purple,
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                        ),
                      ),
                    // Marcar como lido
                    if (!isDismissed)
                      TextButton.icon(
                        onPressed: () => _dismissAnnouncement(announcement),
                        icon: const Icon(Icons.check, size: 16),
                        label: const Text('Marcar lido'),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.green,
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }
}

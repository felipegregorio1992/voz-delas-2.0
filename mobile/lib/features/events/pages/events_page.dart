import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../models/event.dart';
import '../services/events_service.dart';
import '../../announcements/models/announcement.dart';
import '../../announcements/services/announcements_service.dart';
import '../../announcements/widgets/banner_carousel.dart';

const _kMonths = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const _kDayShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

class EventsPage extends ConsumerStatefulWidget {
  const EventsPage({super.key});

  @override
  ConsumerState<EventsPage> createState() => _EventsPageState();
}

class _EventsPageState extends ConsumerState<EventsPage> {
  List<AppEvent> _events = [];
  List<Announcement> _announcements = [];
  List<Announcement> _banners = [];
  bool _loading = true;
  DateTime _focusedMonth = DateTime.now();
  DateTime? _selectedDate;

  @override
  void initState() {
    super.initState();
    _loadEvents();
  }

  Future<void> _loadEvents() async {
    setState(() => _loading = true);
    try {
      final eventsService = ref.read(eventsServiceProvider);
      final announcementsService = ref.read(announcementsServiceProvider);
      final results = await Future.wait([
        eventsService.getPublishedEvents(),
        announcementsService.getActiveAnnouncements(),
      ]);
      if (mounted) {
        final allAnnouncements = results[1] as List<Announcement>;
        setState(() {
          _events = results[0] as List<AppEvent>;
          // Filtrar apenas announcements que têm data (para mostrar no calendário)
          _announcements = allAnnouncements
              .where((a) => a.startDate != null || a.endDate != null)
              .toList();
          // Banners para o carrossel
          _banners = allAnnouncements.where((a) => a.isBanner).toList();
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _register(AppEvent event) async {
    final service = ref.read(eventsServiceProvider);
    final success = await service.registerForEvent(event.id);
    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Inscrição realizada!'), backgroundColor: Colors.green),
        );
        _loadEvents();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Erro ao se inscrever'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _cancelRegistration(AppEvent event) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancelar inscrição?'),
        content: Text('Deseja cancelar sua inscrição em "${event.title}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Não')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Sim, cancelar'),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    final service = ref.read(eventsServiceProvider);
    final success = await service.cancelRegistration(event.id);
    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Inscrição cancelada'), backgroundColor: Colors.orange),
        );
        _loadEvents();
      }
    }
  }

  List<AppEvent> _eventsOnDay(DateTime date) {
    return _events.where((e) {
      final d = e.startDate.toLocal();
      return d.year == date.year && d.month == date.month && d.day == date.day;
    }).toList();
  }

  List<Announcement> _announcementsOnDay(DateTime date) {
    return _announcements.where((a) {
      if (a.startDate != null) {
        final d = a.startDate!.toLocal();
        if (d.year == date.year && d.month == date.month && d.day == date.day) return true;
      }
      if (a.endDate != null) {
        final d = a.endDate!.toLocal();
        if (d.year == date.year && d.month == date.month && d.day == date.day) return true;
      }
      // Check if date is between start and end
      if (a.startDate != null && a.endDate != null) {
        final start = DateTime(a.startDate!.year, a.startDate!.month, a.startDate!.day);
        final end = DateTime(a.endDate!.year, a.endDate!.month, a.endDate!.day);
        final check = DateTime(date.year, date.month, date.day);
        if (check.isAfter(start) && check.isBefore(end)) return true;
      }
      return false;
    }).toList();
  }

  bool _hasItemsOnDay(DateTime date) {
    return _eventsOnDay(date).isNotEmpty || _announcementsOnDay(date).isNotEmpty;
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Eventos',
      showBackButton: true,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadEvents,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  children: [
                    // Carrossel de Banners
                    if (_banners.isNotEmpty) ...[
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                        child: BannerCarousel(banners: _banners),
                      ),
                      const SizedBox(height: 12),
                    ],
                    _buildCalendar(),
                    const Divider(height: 1),
                    _buildEventsList(),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildCalendar() {
    final year = _focusedMonth.year;
    final month = _focusedMonth.month;
    final firstDay = DateTime(year, month, 1).weekday % 7;
    final daysInMonth = DateTime(year, month + 1, 0).day;
    final today = DateTime.now();

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  onPressed: () => setState(() => _focusedMonth = DateTime(year, month - 1)),
                ),
                Text('${_kMonths[month - 1]} $year',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: () => setState(() => _focusedMonth = DateTime(year, month + 1)),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              children: _kDayShort.map((d) => Expanded(
                child: Center(child: Text(d, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey))),
              )).toList(),
            ),
          ),
          const SizedBox(height: 4),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 7, childAspectRatio: 1),
              itemCount: firstDay + daysInMonth,
              itemBuilder: (context, index) {
                if (index < firstDay) return const SizedBox();
                final day = index - firstDay + 1;
                final date = DateTime(year, month, day);
                final isToday = date.year == today.year && date.month == today.month && date.day == today.day;
                final isSelected = _selectedDate != null && date.year == _selectedDate!.year && date.month == _selectedDate!.month && date.day == _selectedDate!.day;
                final hasItems = _hasItemsOnDay(date);

                return GestureDetector(
                  onTap: () => setState(() => _selectedDate = isSelected ? null : date),
                  child: Container(
                    margin: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      color: isSelected ? Colors.purple : hasItems ? const Color(0xFFFCE4EC) : isToday ? Colors.purple.shade50 : null,
                      borderRadius: BorderRadius.circular(8),
                      border: isToday && !isSelected
                          ? Border.all(color: Colors.purple, width: 1.5)
                          : hasItems && !isSelected
                              ? Border.all(color: const Color(0xFFF48FB1), width: 1)
                              : null,
                    ),
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Text('$day', style: TextStyle(
                          fontSize: 13,
                          fontWeight: hasItems || isToday ? FontWeight.bold : FontWeight.normal,
                          color: isSelected ? Colors.white : hasItems ? const Color(0xFFE91E63) : Colors.black87,
                        )),
                        if (hasItems && !isSelected)
                          Positioned(
                            bottom: 4,
                            child: Container(width: 5, height: 5, decoration: const BoxDecoration(color: Color(0xFFE91E63), shape: BoxShape.circle)),
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEventsList() {
    final eventsToShow = _selectedDate != null ? _eventsOnDay(_selectedDate!) : _events;
    final announcementsToShow = _selectedDate != null ? _announcementsOnDay(_selectedDate!) : <Announcement>[];

    if (eventsToShow.isEmpty && announcementsToShow.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(32),
        child: Center(
          child: Column(
            children: [
              Icon(Icons.event_busy, size: 48, color: Colors.grey.shade300),
              const SizedBox(height: 12),
              Text(
                _selectedDate != null ? 'Nenhum evento neste dia' : 'Nenhum evento disponível',
                style: TextStyle(color: Colors.grey.shade500),
              ),
            ],
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_selectedDate != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  Text('${_selectedDate!.day} de ${_kMonths[_selectedDate!.month - 1]}',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => setState(() => _selectedDate = null),
                    child: Text('Ver todos', style: TextStyle(fontSize: 12, color: Colors.purple.shade400, decoration: TextDecoration.underline)),
                  ),
                ],
              ),
            ),
          // Avisos com data
          ...announcementsToShow.map((a) => _buildAnnouncementCard(a)),
          // Eventos
          ...eventsToShow.map((event) => _buildEventCard(event)),
        ],
      ),
    );
  }

  Widget _buildAnnouncementCard(Announcement announcement) {
    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      color: Colors.orange.shade50,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: Colors.orange.shade100, borderRadius: BorderRadius.circular(6)),
                  child: Text('Aviso', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.orange.shade800)),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(announcement.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            if (announcement.content != null && announcement.content!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(announcement.content!, maxLines: 3, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, color: Colors.black54)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildEventCard(AppEvent event) {
    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (event.imageUrl != null)
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              child: Image.network(event.imageUrl!, width: double.infinity, height: 120, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox.shrink()),
            ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Badges
                Wrap(
                  spacing: 6,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: Colors.green.shade100, borderRadius: BorderRadius.circular(6)),
                      child: Text(event.categoryLabel, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.green.shade800)),
                    ),
                    if (event.isRegistered)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(color: Colors.purple.shade100, borderRadius: BorderRadius.circular(6)),
                        child: Text('Inscrito ✓', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.purple.shade800)),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(event.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                if (event.description != null) ...[
                  const SizedBox(height: 4),
                  Text(event.description!, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, color: Colors.black54)),
                ],
                const SizedBox(height: 8),
                // Meta info
                Wrap(
                  spacing: 12,
                  runSpacing: 4,
                  children: [
                    Row(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.calendar_today, size: 14, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text('${event.startDate.day}/${event.startDate.month}/${event.startDate.year}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    ]),
                    if (event.startTime != null)
                      Row(mainAxisSize: MainAxisSize.min, children: [
                        const Icon(Icons.access_time, size: 14, color: Colors.grey),
                        const SizedBox(width: 4),
                        Text('${event.startTime}${event.endTime != null ? " - ${event.endTime}" : ""}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                      ]),
                    if (event.location != null)
                      Row(mainAxisSize: MainAxisSize.min, children: [
                        const Icon(Icons.location_on, size: 14, color: Colors.grey),
                        const SizedBox(width: 4),
                        Text(event.location!, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                      ]),
                    Row(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.people, size: 14, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text('${event.slotsUsed}${event.maxSlots != null ? "/${event.maxSlots}" : ""} inscritos', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    ]),
                  ],
                ),
                const SizedBox(height: 12),
                // Action button
                SizedBox(
                  width: double.infinity,
                  child: event.isRegistered
                      ? OutlinedButton(
                          onPressed: () => _cancelRegistration(event),
                          style: OutlinedButton.styleFrom(foregroundColor: Colors.red, side: const BorderSide(color: Colors.red)),
                          child: const Text('Cancelar Inscrição'),
                        )
                      : ElevatedButton(
                          onPressed: event.hasAvailableSlots ? () => _register(event) : null,
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.purple, foregroundColor: Colors.white),
                          child: Text(event.isFull ? 'Vagas Esgotadas' : 'Inscrever-se'),
                        ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class AppEvent {
  final String id;
  final String title;
  final String? description;
  final String category;
  final String status;
  final String? location;
  final String? imageUrl;
  final DateTime startDate;
  final DateTime? endDate;
  final String? startTime;
  final String? endTime;
  final int? maxSlots;
  final String? sector;
  final String? program;
  final int slotsUsed;
  final String? registrationStatus; // CONFIRMED, CANCELLED, null

  AppEvent({
    required this.id,
    required this.title,
    this.description,
    required this.category,
    required this.status,
    this.location,
    this.imageUrl,
    required this.startDate,
    this.endDate,
    this.startTime,
    this.endTime,
    this.maxSlots,
    this.sector,
    this.program,
    this.slotsUsed = 0,
    this.registrationStatus,
  });

  factory AppEvent.fromJson(Map<String, dynamic> json) {
    return AppEvent(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      category: json['category'] as String,
      status: json['status'] as String,
      location: json['location'] as String?,
      imageUrl: json['imageUrl'] as String?,
      startDate: DateTime.parse(json['startDate']),
      endDate: json['endDate'] != null ? DateTime.parse(json['endDate']) : null,
      startTime: json['startTime'] as String?,
      endTime: json['endTime'] as String?,
      maxSlots: json['maxSlots'] as int?,
      sector: json['sector'] as String?,
      program: json['program'] as String?,
      slotsUsed: json['slotsUsed'] as int? ?? (json['_count'] != null ? json['_count']['registrations'] as int? ?? 0 : 0),
      registrationStatus: json['registrationStatus'] as String?,
    );
  }

  bool get isRegistered => registrationStatus == 'CONFIRMED';
  bool get isFull => maxSlots != null && slotsUsed >= maxSlots!;
  bool get hasAvailableSlots => maxSlots == null || slotsUsed < maxSlots!;

  String get categoryLabel {
    switch (category) {
      case 'COURSE': return 'Curso';
      case 'WORKSHOP': return 'Oficina';
      case 'PHYSICAL_ACTIVITY': return 'Atividade Física';
      case 'CULTURAL': return 'Cultural';
      case 'HEALTH': return 'Saúde';
      case 'ENTREPRENEURSHIP': return 'Empreendedorismo';
      default: return 'Outro';
    }
  }
}

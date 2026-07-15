class EventModel {
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
  final int registrationCount;
  final String? sector;
  final String? program;
  final bool registered;
  final String? registrationStatus;

  EventModel({
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
    this.registrationCount = 0,
    this.sector,
    this.program,
    this.registered = false,
    this.registrationStatus,
  });

  factory EventModel.fromJson(Map<String, dynamic> json) {
    int regCount = 0;
    if (json['_count'] != null && json['_count']['registrations'] != null) {
      regCount = json['_count']['registrations'] as int;
    }

    return EventModel(
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
      registrationCount: regCount,
      sector: json['sector'] as String?,
      program: json['program'] as String?,
      registered: json['registered'] as bool? ?? false,
      registrationStatus: json['registrationStatus'] as String?,
    );
  }

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

  bool get hasSlots => maxSlots == null || registrationCount < maxSlots!;
  String get slotsText => maxSlots != null ? '$registrationCount/$maxSlots vagas' : '$registrationCount inscritas';
}

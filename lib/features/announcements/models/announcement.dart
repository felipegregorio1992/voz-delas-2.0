class Announcement {
  final String id;
  final String title;
  final String? content;
  final String? imageUrl;
  final String? linkUrl;
  final String type; // 'BANNER' or 'NOTICE'
  final bool isActive;
  final DateTime? startDate;
  final DateTime? endDate;
  final DateTime createdAt;
  final bool dismissed;

  Announcement({
    required this.id,
    required this.title,
    this.content,
    this.imageUrl,
    this.linkUrl,
    required this.type,
    required this.isActive,
    this.startDate,
    this.endDate,
    required this.createdAt,
    this.dismissed = false,
  });

  factory Announcement.fromJson(Map<String, dynamic> json) {
    return Announcement(
      id: json['id'] as String,
      title: json['title'] as String,
      content: json['content'] as String?,
      imageUrl: json['imageUrl'] as String?,
      linkUrl: json['linkUrl'] as String?,
      type: json['type'] as String,
      isActive: json['isActive'] as bool? ?? true,
      startDate: json['startDate'] != null ? DateTime.parse(json['startDate']) : null,
      endDate: json['endDate'] != null ? DateTime.parse(json['endDate']) : null,
      createdAt: DateTime.parse(json['createdAt']),
      dismissed: json['dismissed'] as bool? ?? false,
    );
  }

  bool get isBanner => type == 'BANNER';
  bool get isNotice => type == 'NOTICE';
  bool get hasLink => linkUrl != null && linkUrl!.isNotEmpty;
}

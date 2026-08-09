/// A journal page — mirror of the web/PWA entry shape so the backup JSON
/// from any flavor imports cleanly into the native app.
class Mention {
  const Mention({required this.id, required this.label, required this.note});

  final String id;
  final String label;
  final String note;

  factory Mention.fromJson(Map<String, dynamic> json) => Mention(
        id: (json['id'] as String?) ?? '',
        label: (json['label'] as String?) ?? '',
        note: (json['note'] as String?) ?? '',
      );

  Map<String, dynamic> toJson() => {'id': id, 'label': label, 'note': note};
}

class JournalEntry {
  const JournalEntry({
    required this.id,
    required this.type,
    required this.date,
    required this.title,
    required this.note,
    required this.photo,
    required this.photoSize,
    required this.photoCaption,
    required this.icon,
    required this.arrow,
    required this.week,
    required this.trimester,
    required this.mentions,
    required this.weekCard,
    required this.createdAt,
    required this.sortOrder,
  });

  final String id;
  final String type; // milestone | memory | note
  final String date; // '' or YYYY-MM-DD
  final String title;
  final String note;
  final String? photo; // local path / data URL in native storage
  final String photoSize; // small | large
  final String photoCaption;
  final String icon; // emoji
  final bool arrow;
  final int week;
  final int trimester; // 1 | 2 | 3
  final List<Mention> mentions;
  final bool weekCard;
  final int createdAt;
  final double sortOrder;

  factory JournalEntry.fromJson(Map<String, dynamic> json) => JournalEntry(
        id: (json['id'] as String?) ?? '',
        type: (json['type'] as String?) ?? 'note',
        date: (json['date'] as String?) ?? '',
        title: (json['title'] as String?) ?? '',
        note: (json['note'] as String?) ?? '',
        photo: json['photo'] as String?,
        photoSize: (json['photoSize'] as String?) ?? 'large',
        photoCaption: (json['photoCaption'] as String?) ?? '',
        icon: (json['icon'] as String?) ?? '💛',
        arrow: (json['arrow'] as bool?) ?? false,
        week: (json['week'] as num?)?.toInt() ?? 0,
        trimester: (json['trimester'] as num?)?.toInt() ?? 0,
        mentions: ((json['mentions'] as List?) ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(Mention.fromJson)
            .toList(),
        weekCard: (json['weekCard'] as bool?) ?? false,
        createdAt: (json['createdAt'] as num?)?.toInt() ?? 0,
        sortOrder: (json['sortOrder'] as num?)?.toDouble() ?? 0,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'date': date,
        'title': title,
        'note': note,
        'photo': photo,
        'photoSize': photoSize,
        'photoCaption': photoCaption,
        'icon': icon,
        'arrow': arrow,
        'week': week,
        'trimester': trimester,
        'mentions': mentions.map((m) => m.toJson()).toList(),
        'weekCard': weekCard,
        'createdAt': createdAt,
        'sortOrder': sortOrder,
      };
}

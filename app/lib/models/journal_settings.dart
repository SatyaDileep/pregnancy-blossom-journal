/// Journal settings — mirror of `data/settings.json` (web) / the PWA's
/// settings store. The backup JSON from any flavor maps 1:1 onto this.
class JournalSettings {
  const JournalSettings({
    required this.journalTitle,
    required this.mamaName,
    required this.papaName,
    required this.babyNickname,
    required this.dueDate,
    required this.lmpDate,
    required this.coverMessage,
    required this.coverEmoji,
    required this.theme,
  });

  final String journalTitle;
  final String mamaName;
  final String papaName;
  final String babyNickname;
  final String dueDate; // '' or YYYY-MM-DD
  final String lmpDate; // '' or YYYY-MM-DD
  final String coverMessage;
  final String coverEmoji;
  final String theme; // blush | lavender | sage | ocean | peach | midnight

  static const defaults = JournalSettings(
    journalTitle: 'Our Journey To You',
    mamaName: 'Mummy',
    papaName: 'Daddy',
    babyNickname: 'Little One',
    dueDate: '',
    lmpDate: '',
    coverMessage: 'Every little moment of waiting for you, tucked away gently. This is our story.',
    coverEmoji: '🌼',
    theme: 'blush',
  );

  factory JournalSettings.fromJson(Map<String, dynamic> json) => JournalSettings(
        journalTitle: (json['journalTitle'] as String?)?.trim().isNotEmpty == true
            ? (json['journalTitle'] as String).trim()
            : defaults.journalTitle,
        mamaName: (json['mamaName'] as String?)?.trim().isNotEmpty == true
            ? (json['mamaName'] as String).trim()
            : 'Mummy',
        papaName: (json['papaName'] as String?)?.trim().isNotEmpty == true
            ? (json['papaName'] as String).trim()
            : 'Daddy',
        babyNickname: (json['babyNickname'] as String?)?.trim().isNotEmpty == true
            ? (json['babyNickname'] as String).trim()
            : 'Little One',
        dueDate: (json['dueDate'] as String?) ?? '',
        lmpDate: (json['lmpDate'] as String?) ?? '',
        coverMessage: (json['coverMessage'] as String?) ?? '',
        coverEmoji: (json['coverEmoji'] as String?) ?? '🌼',
        theme: (json['theme'] as String?) ?? 'blush',
      );

  Map<String, dynamic> toJson() => {
        'journalTitle': journalTitle,
        'mamaName': mamaName,
        'papaName': papaName,
        'babyNickname': babyNickname,
        'dueDate': dueDate,
        'lmpDate': lmpDate,
        'coverMessage': coverMessage,
        'coverEmoji': coverEmoji,
        'theme': theme,
      };

  JournalSettings copyWith({String? theme}) => JournalSettings(
        journalTitle: journalTitle,
        mamaName: mamaName,
        papaName: papaName,
        babyNickname: babyNickname,
        dueDate: dueDate,
        lmpDate: lmpDate,
        coverMessage: coverMessage,
        coverEmoji: coverEmoji,
        theme: theme ?? this.theme,
      );
}

/// Naegele's rule — the same +280-day math the web app uses.
String? addDays(String iso, int n) {
  final d = DateTime.tryParse('${iso}T00:00:00');
  if (d == null) return null;
  final r = d.add(Duration(days: n));
  return '${r.year.toString().padLeft(4, '0')}-'
      '${r.month.toString().padLeft(2, '0')}-'
      '${r.day.toString().padLeft(2, '0')}';
}

String? effectiveDueDate(JournalSettings s) =>
    s.dueDate.isNotEmpty ? s.dueDate : (s.lmpDate.isNotEmpty ? addDays(s.lmpDate, 280) : null);

/// The pregnancy week on a given date (0-based age from LMP), or null when
/// there's no due date or the date falls outside the pregnancy.
int? weekFromDate(JournalSettings s, String dateISO) {
  final due = effectiveDueDate(s);
  if (due == null || dateISO.isEmpty) return null;
  final dueDate = DateTime.tryParse('${due}T00:00:00');
  final at = DateTime.tryParse('${dateISO}T00:00:00');
  if (dueDate == null || at == null) return null;
  final ageDays = dueDate.difference(at).inDays;
  final age = 280 - ageDays;
  if (age < 0) return null;
  return (age ~/ 7) + 1;
}

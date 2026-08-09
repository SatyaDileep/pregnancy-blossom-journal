import 'package:flutter/material.dart';

/// One of the six warm palettes, ported verbatim from the web app's
/// `styles.css` theme blocks so every platform shares the same soul.
class BlossomPalette {
  const BlossomPalette({
    required this.id,
    required this.label,
    required this.emoji,
    required this.paper,
    required this.paper2,
    required this.ink,
    required this.inkSoft,
    required this.noteInk,
    required this.rose,
    required this.roseSoft,
    required this.sage,
    required this.sageSoft,
    required this.lavender,
    required this.peach,
    required this.sky,
    required this.warmBg,
    required this.gold,
    required this.butter,
    required this.chipInk,
  });

  final String id;
  final String label;
  final String emoji;

  final Color paper; // page background
  final Color paper2; // deeper paper
  final Color ink; // main text
  final Color inkSoft; // muted text
  final Color noteInk; // note text
  final Color rose; // primary accent
  final Color roseSoft;
  final Color sage; // secondary green
  final Color sageSoft;
  final Color lavender;
  final Color peach;
  final Color sky;
  final Color warmBg; // app background
  final Color gold;
  final Color butter;
  final Color chipInk;

  Color get borderSoft => ink.withValues(alpha: 0.14);

  Color get glowA => rose.withValues(alpha: 0.28);

  /// A Material 3 theme shaped by this palette.
  ThemeData get theme {
    final scheme = ColorScheme(
      brightness: ink.computeLuminance() > 0.5 ? Brightness.dark : Brightness.light,
      primary: rose,
      onPrimary: paper,
      secondary: sage,
      onSecondary: paper,
      tertiary: lavender,
      onTertiary: paper,
      surface: paper,
      onSurface: ink,
      surfaceContainerHighest: paper2,
      onSurfaceVariant: inkSoft,
      outline: borderSoft,
      outlineVariant: borderSoft,
      error: const Color(0xFFb3261e),
      onError: Colors.white,
      shadow: Colors.black38,
      surfaceTint: rose,
      inverseSurface: ink,
      onInverseSurface: paper,
      inversePrimary: roseSoft,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: warmBg,
      splashFactory: InkSparkle.splashFactory,
      cardTheme: CardThemeData(
        color: paper.withValues(alpha: 0.92),
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: BorderSide(color: borderSoft),
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: ink,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          color: ink,
          fontSize: 22,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.2,
        ),
      ),
      textTheme: TextTheme(
        displaySmall: TextStyle(color: ink, fontSize: 34, fontWeight: FontWeight.w600, height: 1.1),
        headlineSmall: TextStyle(color: ink, fontSize: 24, fontWeight: FontWeight.w600),
        titleMedium: TextStyle(color: ink, fontSize: 17, fontWeight: FontWeight.w600),
        titleSmall: TextStyle(color: ink, fontSize: 15, fontWeight: FontWeight.w600),
        bodyMedium: TextStyle(color: ink, fontSize: 15, height: 1.45),
        bodySmall: TextStyle(color: inkSoft, fontSize: 13, height: 1.4),
        labelMedium: TextStyle(color: inkSoft, fontSize: 12.5, fontWeight: FontWeight.w600, letterSpacing: 0.2),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: paper2,
        selectedColor: rose.withValues(alpha: 0.16),
        side: BorderSide(color: borderSoft),
        labelStyle: TextStyle(color: ink, fontSize: 13),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: ink,
        contentTextStyle: TextStyle(color: paper),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}

const List<BlossomPalette> kPalettes = [
  BlossomPalette(
    id: 'blush',
    label: 'Blush',
    emoji: '🌷',
    paper: Color(0xFFFFFDF6),
    paper2: Color(0xFFFFF9EC),
    ink: Color(0xFF5D4B3F),
    inkSoft: Color(0xFF8A7566),
    noteInk: Color(0xFF54453B),
    rose: Color(0xFFC96F75),
    roseSoft: Color(0xFFDCA0A5),
    sage: Color(0xFF9DB897),
    sageSoft: Color(0xFFCFE0CA),
    lavender: Color(0xFFCDB4DB),
    peach: Color(0xFFF4C9A3),
    sky: Color(0xFFA9C6D8),
    warmBg: Color(0xFFF7F0E7),
    gold: Color(0xFFC9A35A),
    butter: Color(0xFFF0D589),
    chipInk: Color(0xFF4C6A47),
  ),
  BlossomPalette(
    id: 'lavender',
    label: 'Lavender',
    emoji: '🪻',
    paper: Color(0xFFFDFBFE),
    paper2: Color(0xFFF7F1FB),
    ink: Color(0xFF5A4A66),
    inkSoft: Color(0xFF8A7999),
    noteInk: Color(0xFF554668),
    rose: Color(0xFFA57FC4),
    roseSoft: Color(0xFFC3A7DE),
    sage: Color(0xFFAEB1CD),
    sageSoft: Color(0xFFD8D4EA),
    lavender: Color(0xFFCFBAE4),
    peach: Color(0xFFE3C9EC),
    sky: Color(0xFFB7A8D6),
    warmBg: Color(0xFFF4EEF8),
    gold: Color(0xFFC9A35A),
    butter: Color(0xFFF0D589),
    chipInk: Color(0xFF5F4A76),
  ),
  BlossomPalette(
    id: 'sage',
    label: 'Sage',
    emoji: '🌿',
    paper: Color(0xFFFBFDF8),
    paper2: Color(0xFFF3F8EF),
    ink: Color(0xFF4C5A4A),
    inkSoft: Color(0xFF798A76),
    noteInk: Color(0xFF4A5A48),
    rose: Color(0xFF6F9A72),
    roseSoft: Color(0xFF9FBFa2),
    sage: Color(0xFF7FA884),
    sageSoft: Color(0xFFD2E4D6),
    lavender: Color(0xFFB7CDB4),
    peach: Color(0xFFEAD9B2),
    sky: Color(0xFF8FB3A0),
    warmBg: Color(0xFFF0F4EC),
    gold: Color(0xFFB9903F),
    butter: Color(0xFFEAD9A6),
    chipInk: Color(0xFF3F5C43),
  ),
  BlossomPalette(
    id: 'ocean',
    label: 'Ocean',
    emoji: '🌊',
    paper: Color(0xFFFBFDFE),
    paper2: Color(0xFFF2F7FA),
    ink: Color(0xFF3F5565),
    inkSoft: Color(0xFF6F8698),
    noteInk: Color(0xFF3F5560),
    rose: Color(0xFF6F9DB8),
    roseSoft: Color(0xFFA3C4D9),
    sage: Color(0xFF9FB7CD),
    sageSoft: Color(0xFFD5E2EC),
    lavender: Color(0xFFB6C8DD),
    peach: Color(0xFFF0C9B0),
    sky: Color(0xFF7EA8C4),
    warmBg: Color(0xFFEFF4F7),
    gold: Color(0xFFC9A35A),
    butter: Color(0xFFF0D589),
    chipInk: Color(0xFF3C6280),
  ),
  BlossomPalette(
    id: 'peach',
    label: 'Peach',
    emoji: '🍑',
    paper: Color(0xFFFFFDF9),
    paper2: Color(0xFFFCF3EA),
    ink: Color(0xFF5D4A3D),
    inkSoft: Color(0xFF8A7668),
    noteInk: Color(0xFF57483C),
    rose: Color(0xFFD98A6C),
    roseSoft: Color(0xFFEAB39A),
    sage: Color(0xFFD8B48A),
    sageSoft: Color(0xFFEFDCBE),
    lavender: Color(0xFFE4C2AC),
    peach: Color(0xFFF4C9A3),
    sky: Color(0xFFE0A68F),
    warmBg: Color(0xFFFAF2EC),
    gold: Color(0xFFC9A35A),
    butter: Color(0xFFF0D589),
    chipInk: Color(0xFF7A5236),
  ),
  BlossomPalette(
    id: 'midnight',
    label: 'Midnight',
    emoji: '🌙',
    paper: Color(0xFF2C2735),
    paper2: Color(0xFF332D40),
    ink: Color(0xFFECE6F0),
    inkSoft: Color(0xFFB3AAC2),
    noteInk: Color(0xFFDDD5E8),
    rose: Color(0xFFC9A0D6),
    roseSoft: Color(0xFFB58CC6),
    sage: Color(0xFF7D9C8A),
    sageSoft: Color(0xFF5A7066),
    lavender: Color(0xFF6F5F8A),
    peach: Color(0xFFC89A8A),
    sky: Color(0xFF6F8CA0),
    warmBg: Color(0xFF211D2A),
    gold: Color(0xFFD8BE7A),
    butter: Color(0xFF8A7A4A),
    chipInk: Color(0xFFCFE0CA),
  ),
];

/// Makes the current palette available anywhere in the tree and lets any
/// widget switch themes: `ThemeScope.of(context).setTheme('ocean')`.
class ThemeScope extends InheritedNotifier<ValueNotifier<BlossomPalette>> {
  const ThemeScope({
    super.key,
    required ValueNotifier<BlossomPalette> notifier,
    required super.child,
  }) : super(notifier: notifier);

  static BlossomPalette of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<ThemeScope>();
    assert(scope != null, 'ThemeScope not found in widget tree');
    return scope!.notifier!.value;
  }

  static void set(BuildContext context, String id) {
    final scope = context.dependOnInheritedWidgetOfExactType<ThemeScope>();
    final palette = kPalettes.where((p) => p.id == id).firstOrNull;
    if (scope != null && palette != null) scope.notifier!.value = palette;
  }
}

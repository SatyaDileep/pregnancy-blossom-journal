import 'package:flutter/material.dart';

import 'screens/home_screen.dart';
import 'theme/app_themes.dart';

void main() {
  runApp(const BlossomApp());
}

class BlossomApp extends StatelessWidget {
  const BlossomApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ThemeScope(
      notifier: ValueNotifier<BlossomPalette>(kPalettes.first),
      child: const _App(),
    );
  }
}

class _App extends StatelessWidget {
  const _App();

  @override
  Widget build(BuildContext context) {
    final palette = ThemeScope.of(context);
    return MaterialApp(
      title: 'Blossom Journal',
      debugShowCheckedModeBanner: false,
      theme: palette.theme,
      home: const HomeScreen(),
    );
  }
}

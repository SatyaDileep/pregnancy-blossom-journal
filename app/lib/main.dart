import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart' show SemanticsBinding;

import 'screens/home_screen.dart';
import 'theme/app_themes.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // Expose the accessibility/semantics tree from the start — makes the app
  // screen-reader friendly and lets assistive tech explore every control.
  SemanticsBinding.instance.ensureSemantics();
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

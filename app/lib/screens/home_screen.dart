import 'package:flutter/material.dart';

import '../data/guide_data.dart';
import '../models/journal_settings.dart';
import '../theme/app_themes.dart';

/// The native app's home — a warm cover, a live theme picker, and the
/// week-by-week guidance loaded from the shared content asset. The journal
/// itself (carousel + stacked views, entries, photos) lands on top of this
/// foundation in the next milestones.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final Future<GuideData> _guideFuture;
  late JournalSettings _settings;

  @override
  void initState() {
    super.initState();
    _guideFuture = GuideLoader.load();
    _settings = JournalSettings.defaults;
  }

  @override
  Widget build(BuildContext context) {
    final palette = ThemeScope.of(context);
    final theme = Theme.of(context);

    return Scaffold(
      body: Stack(
        children: [
          // Soft glow washes, like the web app's background.
          Positioned(
            top: -120,
            right: -80,
            child: Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(colors: [palette.glowA, palette.glowA.withValues(alpha: 0)]),
              ),
            ),
          ),
          Positioned(
            top: 120,
            left: -100,
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [palette.sky.withValues(alpha: 0.22), palette.sky.withValues(alpha: 0)],
                ),
              ),
            ),
          ),
          SafeArea(
            child: FutureBuilder<GuideData>(
              future: _guideFuture,
              builder: (context, snapshot) {
                final guide = snapshot.data ?? GuideLoader.empty;
                return ListView(
                  padding: const EdgeInsets.fromLTRB(20, 18, 20, 32),
                  children: [
                    _CoverCard(settings: _settings, palette: palette),
                    const SizedBox(height: 18),
                    _ThemePicker(current: palette),
                    const SizedBox(height: 18),
                    _GuideSection(guide: guide, palette: palette),
                    const SizedBox(height: 18),
                    _NextCard(theme: theme, palette: palette),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _CoverCard extends StatelessWidget {
  const _CoverCard({required this.settings, required this.palette});

  final JournalSettings settings;
  final BlossomPalette palette;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Container(
        padding: const EdgeInsets.fromLTRB(24, 30, 24, 28),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(28),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [palette.paper, palette.paper2],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(settings.coverEmoji, style: const TextStyle(fontSize: 40)),
            const SizedBox(height: 12),
            Text(settings.journalTitle, style: theme.textTheme.displaySmall),
            const SizedBox(height: 10),
            Text(
              '${settings.babyNickname}\u2019s story, kept gently — '
              'blossoming on your phone.',
              style: theme.textTheme.bodyMedium?.copyWith(color: palette.inkSoft),
            ),
            const SizedBox(height: 22),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _softPill(context, '🌱 1st trimester · weeks 4–13'),
                _softPill(context, '🌷 2nd · weeks 14–27'),
                _softPill(context, '🌙 3rd · weeks 28–40'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _softPill(BuildContext context, String text) {
    final palette = ThemeScope.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: palette.paper2,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: palette.borderSoft),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: palette.inkSoft,
          fontSize: 12.5,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _ThemePicker extends StatelessWidget {
  const _ThemePicker({required this.current});

  final BlossomPalette current;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Pick your colour', style: theme.textTheme.titleMedium),
            const SizedBox(height: 4),
            Text(
              'Six warm moods, applied everywhere — just like the web journal.',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: kPalettes.map((p) {
                final selected = p.id == current.id;
                return InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: () => ThemeScope.set(context, p.id),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    curve: Curves.easeOut,
                    padding: const EdgeInsets.fromLTRB(10, 8, 12, 8),
                    decoration: BoxDecoration(
                      color: p.paper,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: selected ? p.rose : p.borderSoft,
                        width: selected ? 2 : 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 22,
                          height: 22,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: LinearGradient(
                              colors: [p.rose, p.sage, p.sky],
                            ),
                            border: Border.all(color: Colors.white, width: 1.5),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${p.emoji} ${p.label}',
                          style: TextStyle(
                            color: p.ink,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (selected) ...[
                          const SizedBox(width: 6),
                          Icon(Icons.check_circle, size: 15, color: p.rose),
                        ],
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}

class _GuideSection extends StatelessWidget {
  const _GuideSection({required this.guide, required this.palette});

  final GuideData guide;
  final BlossomPalette palette;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text('Week-by-week guidance', style: theme.textTheme.titleMedium),
            const Spacer(),
            Text(
              '${guide.weeks.length} weeks',
              style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w700),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          'Every week 4–40, with love: baby\u2019s size, growth, common '
          'feelings — and a gentle analogy.',
          style: theme.textTheme.bodySmall,
        ),
        const SizedBox(height: 14),
        if (guide.trimesters.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Text(
                'The guide content will appear here once assets/guide_data.json '
                'is generated (run: node tools/sync_guide.mjs).',
                style: theme.textTheme.bodyMedium,
              ),
            ),
          )
        else
          ...guide.trimesters.map(
            (t) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _TrimesterCard(trimester: t, palette: palette),
            ),
          ),
      ],
    );
  }
}

class _TrimesterCard extends StatelessWidget {
  const _TrimesterCard({required this.trimester, required this.palette});

  final GuideTrimester trimester;
  final BlossomPalette palette;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = trimester.t == 1
        ? palette.rose
        : trimester.t == 2
            ? palette.sage
            : palette.lavender;
    return Card(
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: accent.withValues(alpha: 0.35)),
          color: accent.withValues(alpha: 0.07),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 46,
              height: 46,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: palette.paper.withValues(alpha: 0.9),
                shape: BoxShape.circle,
                border: Border.all(color: accent.withValues(alpha: 0.4)),
              ),
              child: Text(trimester.emoji, style: const TextStyle(fontSize: 22)),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(trimester.name, style: theme.textTheme.titleSmall),
                      ),
                      Text(
                        trimester.range,
                        style: TextStyle(
                          color: palette.inkSoft,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    trimester.tag,
                    style: TextStyle(color: accent, fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  Text(trimester.summary, style: theme.textTheme.bodySmall),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NextCard extends StatelessWidget {
  const _NextCard({required this.theme, required this.palette});

  final ThemeData theme;
  final BlossomPalette palette;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
      decoration: BoxDecoration(
        color: palette.ink,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        children: [
          const Text('🌼', style: TextStyle(fontSize: 26)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Journal, carousel & stacked views arrive next — with your '
              'milestones, photos and the keepsake book.',
              style: theme.textTheme.bodySmall?.copyWith(color: palette.paper, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}

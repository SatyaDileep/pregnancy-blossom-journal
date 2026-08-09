import 'package:flutter/material.dart';

import '../data/guide_data.dart';
import '../models/journal_settings.dart';
import '../theme/app_themes.dart';
import '../widgets/blossom_bot.dart';

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
  GuideData? _guide; // resolved once, so the chat hooks have it ready

  @override
  void initState() {
    super.initState();
    _guideFuture = GuideLoader.load();
    _settings = JournalSettings.defaults;
  }

  void _openBot({String? prompt}) {
    BlossomBot.show(context, guide: _guide, settings: _settings, initialPrompt: prompt);
  }

  /// The pregnancy week right now (from LMP/due date), or null when no dates
  /// are set — mirrors the web app's current-week chip.
  int? get _currentWeek {
    final today = DateTime.now();
    final iso = '${today.year.toString().padLeft(4, '0')}-'
        '${today.month.toString().padLeft(2, '0')}-'
        '${today.day.toString().padLeft(2, '0')}';
    return weekFromDate(_settings, iso);
  }

  @override
  Widget build(BuildContext context) {
    final palette = ThemeScope.of(context);
    final theme = Theme.of(context);

    return Scaffold(
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openBot(),
        tooltip: 'Talk to little one',
        backgroundColor: palette.rose,
        foregroundColor: palette.paper,
        child: const Text('👶', style: TextStyle(fontSize: 24)),
      ),
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
                _guide = guide; // remember for the chat hooks
                return ListView(
                  padding: const EdgeInsets.fromLTRB(20, 18, 20, 32),
                  children: [
                    _CoverCard(settings: _settings, palette: palette, onTalk: () => _openBot()),
                    const SizedBox(height: 18),
                    _ThemePicker(current: palette),
                    const SizedBox(height: 18),
                    _GuideSection(
                      guide: guide,
                      palette: palette,
                      askWeek: _currentWeek,
                      onAsk: (w) {
                        if (w != null && guide.week(w) != null) {
                          _openBot(prompt: _askPrompt(w, _settings.babyNickname));
                        } else {
                          _openBot(); // no dates yet — just open the chat
                        }
                      },
                    ),
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

String _askPrompt(int week, String nickname) {
  final baby = nickname.trim().isEmpty ? 'little one' : nickname.trim();
  return 'What is happening with me and $baby in week $week?';
}

class _CoverCard extends StatelessWidget {
  const _CoverCard({required this.settings, required this.palette, required this.onTalk});

  final JournalSettings settings;
  final BlossomPalette palette;
  final VoidCallback onTalk;

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
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onTalk,
                style: OutlinedButton.styleFrom(
                  foregroundColor: palette.rose,
                  side: BorderSide(color: palette.rose.withValues(alpha: 0.45)),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                icon: const Text('👶', style: TextStyle(fontSize: 17)),
                label: const Text('Talk to little one'),
              ),
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
  const _GuideSection({
    required this.guide,
    required this.palette,
    required this.askWeek,
    required this.onAsk,
  });

  final GuideData guide;
  final BlossomPalette palette;
  final int? askWeek; // current pregnancy week from the settings, or null
  final void Function(int? week) onAsk;

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
        const SizedBox(height: 12),
        Align(
          alignment: Alignment.centerLeft,
          child: ActionChip(
            avatar: const Text('👶', style: TextStyle(fontSize: 14)),
            label: Text(
              askWeek != null && guide.week(askWeek!) != null
                  ? 'Ask Blossom about week $askWeek'
                  : 'Chat with Blossom',
            ),
            backgroundColor: palette.paper2,
            side: BorderSide(color: palette.rose.withValues(alpha: 0.4)),
            labelStyle: TextStyle(color: palette.rose, fontWeight: FontWeight.w700, fontSize: 13),
            onPressed: () => onAsk(askWeek),
          ),
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

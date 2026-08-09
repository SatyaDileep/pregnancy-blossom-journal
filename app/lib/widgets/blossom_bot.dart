import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart' as url_launcher;

import '../data/guide_data.dart';
import '../models/journal_settings.dart';
import '../services/blossom_api.dart';
import '../theme/app_themes.dart';

/// Opens the Blossom Baby chat as a full-height, rounded modal sheet —
/// the native twin of the web/PWA chat widget: consent-first, grounded in the
/// current week, markdown-lite baby replies, suggestion chips, and a settings
/// entry for the companion server URL.
class BlossomBot {
  static Future<void> show(
    BuildContext context, {
    GuideData? guide,
    JournalSettings? settings,
    String? initialPrompt,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _BlossomBotSheet(
        guide: guide ?? GuideLoader.empty,
        settings: settings ?? JournalSettings.defaults,
        initialPrompt: initialPrompt,
      ),
    );
  }
}

class _BlossomBotSheet extends StatefulWidget {
  const _BlossomBotSheet({required this.guide, required this.settings, this.initialPrompt});

  final GuideData guide;
  final JournalSettings settings;
  final String? initialPrompt;

  @override
  State<_BlossomBotSheet> createState() => _BlossomBotSheetState();
}

enum _Mode { unknown, real, demo, sleeping }

class _BlossomBotSheetState extends State<_BlossomBotSheet> {
  static const _consentKey = 'blossom.consent';

  final _api = BlossomApi.instance;
  final _inputCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();

  final List<ChatTurn> _history = [];
  bool _consent = false;
  bool _busy = false;
  bool _sugOpen = false;
  String? _pendingPrompt;
  _Mode _mode = _Mode.unknown;
  bool _modeChecked = false;

  int? get _week {
    final today = DateTime.now();
    final iso = '${today.year.toString().padLeft(4, '0')}-'
        '${today.month.toString().padLeft(2, '0')}-'
        '${today.day.toString().padLeft(2, '0')}';
    return weekFromDate(widget.settings, iso);
  }

  GuideWeek? get _guideWeek => _week == null ? null : widget.guide.week(_week!);

  ChatContext get _context => ChatContext(
        week: _week,
        trimester: _week == null ? null : widget.guide.trimesterFor(_week!),
        dueDate: effectiveDueDate(widget.settings) ?? '',
        lmpDate: widget.settings.lmpDate,
        mamaName: widget.settings.mamaName,
        papaName: widget.settings.papaName,
        babyNickname: widget.settings.babyNickname,
      );

  @override
  void initState() {
    super.initState();
    _pendingPrompt = widget.initialPrompt;
    _restoreConsent();
    _loadConfig();
  }

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _restoreConsent() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() => _consent = prefs.getBool(_consentKey) ?? false);
    _maybeGreet();
  }

  Future<void> _loadConfig() async {
    try {
      await _api.load();
      final cfg = await _api.fetchConfig();
      if (!mounted) return;
      setState(() {
        _mode = cfg.enabled ? _Mode.real : (cfg.mock ? _Mode.demo : _Mode.sleeping);
        _modeChecked = true;
      });
      _maybeGreet();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _mode = _Mode.sleeping;
        _modeChecked = true;
      });
      _maybeGreet();
    }
  }

  void _maybeGreet() {
    if (!mounted || !_consent || _history.isNotEmpty || !_modeChecked) return;
    final baby = widget.settings.babyNickname.isEmpty ? 'little one' : widget.settings.babyNickname;
    final g = _guideWeek;
    final String greeting;
    if (_week != null && g != null) {
      greeting = 'Hiiii, it\'s me, $baby! 🥰 I\'m the size of ${g.size} this week and I\'m '
          'busy practising my somersaults. Ask me how big I am, what\'s happening inside, '
          'or how you\'re feeling — I\'m all ears (well, tiny ears)!';
    } else {
      greeting = 'Hiiii, it\'s me, $baby! 🥰 I\'m right here growing strong. Add your dates '
          'in the journal settings and I can tell you exactly what I\'m up to each week — or '
          'just tell me about your day!';
    }
    setState(() => _history.add(ChatTurn(role: 'assistant', content: greeting)));
  }

  void _acceptConsent() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_consentKey, true);
    if (!mounted) return;
    setState(() => _consent = true);
    final queued = _pendingPrompt;
    _pendingPrompt = null;
    _maybeGreet();
    if (queued != null && queued.isNotEmpty) _send(queued);
  }

  Future<void> _send(String raw) async {
    final text = raw.trim();
    if (text.isEmpty || _busy) return;
    _inputCtrl.clear();
    setState(() {
      _history.add(ChatTurn(role: 'user', content: text));
      _busy = true;
    });
    _scrollBottom();
    try {
      final reply = await _api.sendChat(messages: _history, context: _context);
      if (!mounted) return;
      setState(() {
        _history.add(ChatTurn(role: 'assistant', content: reply));
        _busy = false;
      });
      _scrollBottom();
    } on BlossomServerException catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      _toast(context, e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _busy = false);
      _toast(context, 'Could not reach the companion server — check the ⚙️ server address.');
    }
  }

  void _scrollBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 260),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _toast(BuildContext context, String msg) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(msg), duration: const Duration(seconds: 3)));
  }

  Future<void> _editServer() async {
    final ctrl = TextEditingController(text: _api.server);
    final url = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('AI companion server'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Where Blossom\'s brain lives. The web app and PWA already point here — '
              'use the same address on your phone.',
              style: TextStyle(fontSize: 13),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: ctrl,
              autofocus: true,
              keyboardType: TextInputType.url,
              decoration: const InputDecoration(
                labelText: 'Server URL',
                hintText: 'http://192.168.1.10:51889',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '💡 Android emulator: http://10.0.2.2:51889 · '
              'real phone: your PC\'s LAN IP (e.g. 192.168.x.x)',
              style: TextStyle(fontSize: 11.5, color: ThemeScope.of(context).inkSoft),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, ctrl.text),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (url == null) return;
    await _api.setServer(url);
    if (!mounted) return;
    setState(() => _mode = _Mode.unknown);
    _loadConfig();
  }

  // ---------------- suggestions ----------------

  List<_SugGroup> _suggestionGroups() {
    final withWeek = _week != null;
    return [
      _SugGroup('About this week', withWeek
          ? ['How big am I this week? 🍑', 'What\'s happening inside me this week?', 'What will I be like when I grow up?', 'Tell me a story about this week']
          : ['What can I expect this week?', 'What will I be like when I grow up?', 'Tell me a story about this week']),
      _SugGroup('How I feel', [
        'I\'m feeling tired today 🥱',
        'I feel a little anxious sometimes',
        'I am so excited about meeting you',
        'I had a hard day, comfort me',
      ]),
      _SugGroup('Just for fun', [
        'Tell me something sweet 💛',
        'Sing me a little song',
        'What is your favourite thing to do in there?',
        'Tell me a joke, baby',
      ]),
    ];
  }

  List<String> get _blankChips =>
      _suggestionGroups().expand((g) => g.items).take(4).toList();

  // ---------------- build ----------------

  @override
  Widget build(BuildContext context) {
    final palette = ThemeScope.of(context);
    final theme = Theme.of(context);
    final topInset = MediaQuery.of(context).padding.top;

    return SafeArea(
      top: false,
      child: Container(
        height: MediaQuery.of(context).size.height * 0.92,
        margin: EdgeInsets.only(top: topInset + 8),
        decoration: BoxDecoration(
          color: palette.paper,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Stack(
          children: [
            Column(
              children: [
                _header(palette, theme),
                if (!_consent) _consentCard(palette, theme),
                Expanded(
                  child: _history.isEmpty && !_busy
                      ? _blankSlate(palette, theme)
                      : _messages(palette, theme),
                ),
                _footer(palette, theme),
              ],
            ),
            if (_sugOpen) _suggestionOverlay(palette, theme),
          ],
        ),
      ),
    );
  }

  Widget _header(BlossomPalette palette, ThemeData theme) {
    final status = switch (_mode) {
      _Mode.real => '✨ real AI',
      _Mode.demo => '✨ demo voice',
      _Mode.unknown => '…',
      _Mode.sleeping => '💤 sleeping',
    };
    final weekBadge = _week == null
        ? 'no dates yet'
        : 'Week $_week · ${_week! <= 13 ? '1st' : _week! <= 26 ? '2nd' : '3rd'} trimester';
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 8, 8),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(colors: [palette.roseSoft, palette.lavender]),
            ),
            child: const Text('👶', style: TextStyle(fontSize: 16)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text('Blossom', style: theme.textTheme.titleMedium),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: palette.paper2,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: palette.borderSoft),
                      ),
                      child: Text(status, style: TextStyle(fontSize: 11, color: palette.inkSoft, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  weekBadge,
                  style: TextStyle(fontSize: 12.5, color: palette.inkSoft, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Companion server settings',
            onPressed: _editServer,
            icon: const Icon(Icons.settings_outlined, size: 20),
          ),
          IconButton(
            tooltip: 'Close',
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.close, size: 22),
          ),
        ],
      ),
    );
  }

  Widget _consentCard(BlossomPalette palette, ThemeData theme) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 4, 16, 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: palette.paper2,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: palette.borderSoft),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('One tiny thing first 💛', style: theme.textTheme.titleSmall),
          const SizedBox(height: 8),
          Text(
            'I\'m your cheerleader, not a doctor — I\'ll never give medical advice, and '
            'I\'ll always tell you to call your care team for anything real. Nothing you '
            'say is stored anywhere except on your own device.',
            style: theme.textTheme.bodySmall?.copyWith(height: 1.45),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _acceptConsent,
              style: FilledButton.styleFrom(
                backgroundColor: palette.rose,
                foregroundColor: palette.paper,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              icon: const Text('👶'),
              label: const Text('Sounds good — let\'s talk'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _blankSlate(BlossomPalette palette, ThemeData theme) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
      children: [
        Text('👋', style: TextStyle(fontSize: 34, color: palette.rose)),
        const SizedBox(height: 10),
        Text(
          _guideWeek == null
              ? 'Chat with the tiny voice growing inside you.'
              : 'This week your little one is the size of ${_guideWeek!.size}. '
                  '${_guideWeek!.baby}',
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: 6),
        Text(
          'Ask Blossom anything — or tap a starter below.',
          style: theme.textTheme.bodySmall,
        ),
        const SizedBox(height: 18),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _blankChips
              .map((c) => ActionChip(
                    label: Text(c),
                    onPressed: () => _send(c),
                    backgroundColor: palette.paper2,
                    side: BorderSide(color: palette.borderSoft),
                    labelStyle: TextStyle(color: palette.ink, fontSize: 13, fontWeight: FontWeight.w600),
                  ))
              .toList(),
        ),
      ],
    );
  }

  Widget _messages(BlossomPalette palette, ThemeData theme) {
    return ListView.builder(
      controller: _scrollCtrl,
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      itemCount: _history.length + (_busy ? 1 : 0),
      itemBuilder: (context, i) {
        if (i >= _history.length) return const _TypingBubble();
        final turn = _history[i];
        if (turn.role == 'user') {
          return Align(
            alignment: Alignment.centerRight,
            child: Container(
              margin: const EdgeInsets.only(bottom: 10, left: 48),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: palette.roseSoft.withValues(alpha: 0.55),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                  bottomLeft: Radius.circular(16),
                ),
              ),
              child: Text(turn.content, style: TextStyle(color: palette.ink, fontSize: 14.5, height: 1.4)),
            ),
          );
        }
        return _BabyBubble(text: turn.content, palette: palette, theme: theme);
      },
    );
  }

  Widget _footer(BlossomPalette palette, ThemeData theme) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
      decoration: BoxDecoration(
        color: palette.paper,
        border: Border(top: BorderSide(color: palette.borderSoft)),
      ),
      child: Row(
        children: [
          if (_history.isNotEmpty)
            IconButton(
              tooltip: 'Suggestions',
              onPressed: () => setState(() => _sugOpen = true),
              icon: Icon(Icons.lightbulb_outline, color: palette.inkSoft, size: 22),
            ),
          Expanded(
            child: TextField(
              controller: _inputCtrl,
              enabled: _consent && !_busy,
              textInputAction: TextInputAction.send,
              onSubmitted: _consent && !_busy ? _send : null,
              decoration: InputDecoration(
                hintText: _consent ? 'Talk to your little one…' : 'Tap “Sounds good” to start…',
                filled: true,
                fillColor: palette.paper2,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(999),
                  borderSide: BorderSide(color: palette.borderSoft),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(999),
                  borderSide: BorderSide(color: palette.borderSoft),
                ),
              ),
              style: TextStyle(color: palette.ink, fontSize: 14.5),
            ),
          ),
          const SizedBox(width: 8),
          IconButton.filled(
            tooltip: 'Send',
            onPressed: _consent && !_busy ? () => _send(_inputCtrl.text) : null,
            style: IconButton.styleFrom(
              backgroundColor: palette.rose,
              foregroundColor: palette.paper,
              disabledBackgroundColor: palette.borderSoft,
            ),
            icon: const Icon(Icons.send_rounded, size: 20),
          ),
        ],
      ),
    );
  }

  Widget _suggestionOverlay(BlossomPalette palette, ThemeData theme) {
    return Positioned.fill(
      child: GestureDetector(
        onTap: () => setState(() => _sugOpen = false),
        child: Container(
          color: Colors.black38,
          alignment: Alignment.bottomCenter,
          child: GestureDetector(
            onTap: () {},
            child: Container(
              margin: const EdgeInsets.all(12),
              padding: const EdgeInsets.fromLTRB(16, 18, 16, 14),
              decoration: BoxDecoration(
                color: palette.paper,
                borderRadius: BorderRadius.circular(22),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text('💡 Ideas to try', style: theme.textTheme.titleSmall),
                      const Spacer(),
                      IconButton(
                        onPressed: () => setState(() => _sugOpen = false),
                        icon: const Icon(Icons.close, size: 18),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Flexible(
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _suggestionGroups().expand((g) {
                          return [
                            Padding(
                              padding: const EdgeInsets.only(top: 10, bottom: 6),
                              child: Text(g.label,
                                  style: TextStyle(
                                      color: palette.rose,
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w800)),
                            ),
                            for (final item in g.items)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(12),
                                  onTap: () {
                                    setState(() => _sugOpen = false);
                                    _send(item);
                                  },
                                  child: Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                                    decoration: BoxDecoration(
                                      color: palette.paper2,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: palette.borderSoft),
                                    ),
                                    child: Text(item, style: TextStyle(color: palette.ink, fontSize: 13.5)),
                                  ),
                                ),
                              ),
                          ];
                        }).toList(),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SugGroup {
  _SugGroup(this.label, this.items);
  final String label;
  final List<String> items;
}

// ---------------- baby bubble with markdown-lite ----------------

class _BabyBubble extends StatelessWidget {
  const _BabyBubble({required this.text, required this.palette, required this.theme});

  final String text;
  final BlossomPalette palette;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10, right: 48),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: palette.paper2,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(16),
            topRight: Radius.circular(16),
            bottomRight: Radius.circular(16),
          ),
          border: Border.all(color: palette.borderSoft),
        ),
        child: _MarkdownText(
          text: text,
          baseStyle: TextStyle(color: palette.ink, fontSize: 14.5, height: 1.45),
          accent: palette.rose,
        ),
      ),
    );
  }
}

/// A small, safe markdown-lite renderer (bold, italic, inline code, headings,
/// lists and https links) — the same subset the web widget supports. It only
/// ever produces TextSpan children, so there is no HTML injection surface.
class _MarkdownText extends StatelessWidget {
  const _MarkdownText({required this.text, required this.baseStyle, required this.accent});

  final String text;
  final TextStyle baseStyle;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final spans = <InlineSpan>[];
    var inList = false;

    for (final rawLine in text.split('\n')) {
      final line = rawLine.replaceFirst(RegExp(r'^\s+'), '');
      if (line.isEmpty) {
        if (inList) {
          spans.add(const TextSpan(text: '\n'));
          inList = false;
        }
        continue;
      }

      final heading = RegExp(r'^#{1,3}\s+(.*)$').firstMatch(line);
      if (heading != null) {
        if (inList) spans.add(const TextSpan(text: '\n'));
        inList = false;
        spans.add(TextSpan(
          text: '${heading.group(1)}\n',
          style: baseStyle.copyWith(fontSize: baseStyle.fontSize! + 2, fontWeight: FontWeight.w700),
        ));
        continue;
      }

      final listItem = RegExp(r'^[-*]\s+(.*)$').firstMatch(line);
      if (listItem != null) {
        if (!inList) {
          spans.add(const TextSpan(text: '\n'));
          inList = true;
        }
        spans.add(TextSpan(text: '  • ', style: baseStyle));
        spans.addAll(_inline(listItem.group(1)!, context));
        spans.add(const TextSpan(text: '\n'));
        continue;
      }

      final numbered = RegExp(r'^\d+[.)]\s+(.*)$').firstMatch(line);
      if (numbered != null) {
        if (!inList) {
          spans.add(const TextSpan(text: '\n'));
          inList = true;
        }
        spans.add(TextSpan(text: '  ${numbered.group(0)!.split(RegExp(r'[.)]'))[0]}. ', style: baseStyle));
        spans.addAll(_inline(numbered.group(1)!, context));
        spans.add(const TextSpan(text: '\n'));
        continue;
      }

      if (inList) {
        spans.add(const TextSpan(text: '\n'));
        inList = false;
      }
      spans.addAll(_inline(line, context));
      spans.add(const TextSpan(text: '\n'));
    }

    return Text.rich(TextSpan(children: spans), style: baseStyle);
  }

  List<InlineSpan> _inline(String s, BuildContext context) {
    final out = <InlineSpan>[];
    final buffer = StringBuffer();
    void flush() {
      if (buffer.isNotEmpty) {
        out.add(TextSpan(text: buffer.toString()));
        buffer.clear();
      }
    }

    final bold = RegExp(r'\*\*([^*]+)\*\*');
    final italic = RegExp(r'\*([^*\n]+)\*');
    final code = RegExp(r'`([^`\n]+)`');
    final link = RegExp(r'\[([^\]]+)\]\((https?://[^)\s]+)\)');

    var rest = s;
    while (rest.isNotEmpty) {
      final b = bold.firstMatch(rest);
      final i = italic.firstMatch(rest);
      final c = code.firstMatch(rest);
      final l = link.firstMatch(rest);
      final cands = [
        if (b != null) (b.start, b.end, 'bold'),
        if (i != null) (i.start, i.end, 'italic'),
        if (c != null) (c.start, c.end, 'code'),
        if (l != null) (l.start, l.end, 'link'),
      ];
      if (cands.isEmpty) {
        buffer.write(rest);
        break;
      }
      cands.sort((a, b) => a.$1.compareTo(b.$1));
      final (start, end, kind) = cands.first;
      buffer.write(rest.substring(0, start));
      flush();
      final matched = rest.substring(start, end);
      if (kind == 'bold') {
        out.add(TextSpan(text: bold.firstMatch(matched)!.group(1), style: TextStyle(fontWeight: FontWeight.w700)));
      } else if (kind == 'italic') {
        out.add(TextSpan(text: italic.firstMatch(matched)!.group(1), style: TextStyle(fontStyle: FontStyle.italic)));
      } else if (kind == 'code') {
        out.add(TextSpan(
          text: code.firstMatch(matched)!.group(1),
          style: TextStyle(fontFamily: 'monospace', backgroundColor: _paletteChip(context)),
        ));
      } else {
        final m = link.firstMatch(matched)!;
        final url = m.group(2)!;
        out.add(WidgetSpan(
          alignment: PlaceholderAlignment.baseline,
          baseline: TextBaseline.alphabetic,
          child: GestureDetector(
            onTap: () => url_launcher.launchUrl(Uri.parse(url)),
            child: Text(
              m.group(1)!,
              style: TextStyle(
                color: accent,
                fontWeight: FontWeight.w700,
                decoration: TextDecoration.underline,
              ),
            ),
          ),
        ));
      }
      rest = rest.substring(end);
    }
    flush();
    return out;
  }

  Color _paletteChip(BuildContext context) =>
      ThemeScope.of(context).paper2.withValues(alpha: 0.6);
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();

  @override
  Widget build(BuildContext context) {
    final palette = ThemeScope.of(context);
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10, right: 48),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        decoration: BoxDecoration(
          color: palette.paper2,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: palette.borderSoft),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < 3; i++)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0.35, end: 1),
                  duration: Duration(milliseconds: 700 + i * 140),
                  curve: Curves.easeInOut,
                  builder: (_, v, child) => Opacity(opacity: v, child: child),
                  child: Container(
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: palette.inkSoft),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

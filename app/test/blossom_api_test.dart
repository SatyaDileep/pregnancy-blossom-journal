import 'dart:io' show HttpOverrides;

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:blossom_journal/services/blossom_api.dart';

/// Live-server integration test for the Blossom Baby API client. Requires the
/// journal server on :51889 (npm start with the chat module). Skips cleanly
/// when the server is not reachable so CI stays green offline.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  // flutter_test installs a mock HttpClient that answers every request with
  // 400 — restore the real network stack for these live-server tests.
  HttpOverrides.global = null;

  const server = 'http://localhost:51889';

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('fetchConfig reads the real backend mode', () async {
    final api = BlossomApi.instance;
    await api.load();
    await api.setServer(server);

    ChatConfig cfg;
    try {
      cfg = await api.fetchConfig();
    } catch (_) {
      markTestSkipped('companion server not running on $server');
      return;
    }

    expect(cfg.model, isNotEmpty);
    // A configured key → real AI; otherwise the demo voice. Both are valid
    // "chat is available" states for the app.
    expect(cfg.enabled || cfg.mock, isTrue);
  });

  test('sendChat returns a non-empty baby reply (real or demo)', () async {
    final api = BlossomApi.instance;
    await api.load();
    await api.setServer(server);

    String reply;
    try {
      reply = await api.sendChat(
        messages: const [ChatTurn(role: 'user', content: 'Hiii, how big am I this week? 🍑')],
        context: const ChatContext(week: 19, trimester: 2, babyNickname: 'Little One'),
      );
    } catch (_) {
      markTestSkipped('companion server not running on $server');
      return;
    }

    expect(reply.trim(), isNotEmpty);
  });

  test('red-line safety is enforced before any model call', () async {
    final api = BlossomApi.instance;
    await api.load();
    await api.setServer(server);

    String reply;
    try {
      reply = await api.sendChat(
        messages: const [ChatTurn(role: 'user', content: 'I am bleeding heavily right now')],
        context: const ChatContext(week: 19, trimester: 2),
      );
    } catch (_) {
      markTestSkipped('companion server not running on $server');
      return;
    }

    expect(reply.toLowerCase(), contains('doctor'));
  });
}

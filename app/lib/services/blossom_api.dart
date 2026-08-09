import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb, TargetPlatform;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// A single chat turn sent to the server (role + text), same shape as the
/// web/PWA widget so the backend treats every flavor identically.
class ChatTurn {
  const ChatTurn({required this.role, required this.content});
  final String role; // 'user' | 'assistant'
  final String content;

  Map<String, dynamic> toJson() => {'role': role, 'content': content};
}

/// Live context the server grounds replies in — mirror of the web widget's
/// `chatContext()`. `digest` is left empty until the native journal lands.
class ChatContext {
  const ChatContext({
    this.week,
    this.trimester,
    this.dueDate = '',
    this.lmpDate = '',
    this.mamaName = '',
    this.papaName = '',
    this.babyNickname = '',
    this.digest = '',
  });

  final int? week;
  final int? trimester;
  final String dueDate;
  final String lmpDate;
  final String mamaName;
  final String papaName;
  final String babyNickname;
  final String digest;

  Map<String, dynamic> toJson() => {
        'week': week,
        'trimester': trimester,
        'dueDate': dueDate,
        'lmpDate': lmpDate,
        'mamaName': mamaName,
        'papaName': papaName,
        'babyNickname': babyNickname,
        'digest': digest,
      };
}

/// GET /api/chat/config — tells the client which mode the backend is in so
/// the header can show real AI / demo voice before the first message.
class ChatConfig {
  const ChatConfig({
    required this.enabled,
    required this.mock,
    required this.model,
    required this.artEnabled,
  });

  final bool enabled; // a real GEMINI_API_KEY is configured
  final bool mock; // no key, but the warm demo voice is on
  final String model;
  final bool artEnabled;

  factory ChatConfig.fromJson(Map<String, dynamic> json) => ChatConfig(
        enabled: json['enabled'] == true,
        mock: json['mock'] == true,
        model: (json['model'] as String?) ?? '',
        artEnabled: json['artEnabled'] == true,
      );
}

class BlossomServerException implements Exception {
  const BlossomServerException(this.message, {this.code});
  final String message;
  final String? code;

  @override
  String toString() => message;
}

/// Client for the Blossom Baby companion backend (the same Express server the
/// web app and PWA already talk to). Handles the persisted server URL and
/// device id with the exact same storage keys as the web/PWA, so switching
/// flavors keeps the same daily caps and identity.
class BlossomApi {
  BlossomApi._();

  static final BlossomApi instance = BlossomApi._();

  static const _serverKey = 'blossom.chatApi';
  static const _deviceKey = 'blossom.deviceId';

  /// Sensible default server URL per platform:
  ///  - Android emulator reaches the host PC via 10.0.2.2
  ///  - iOS simulator / desktop / web use localhost
  /// A physical phone needs the PC's LAN IP — paste it in the ⚙️ server
  /// settings inside the chat.
  String get defaultServer => (!kIsWeb && defaultTargetPlatform == TargetPlatform.android)
      ? 'http://10.0.2.2:51889' // Android emulator reaches the host PC this way
      : 'http://localhost:51889'; // simulator / desktop / web

  String _server = '';

  String get server => _server;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _server = prefs.getString(_serverKey) ?? defaultServer;
  }

  Future<void> setServer(String url) async {
    var cleaned = url.trim();
    while (cleaned.endsWith('/')) {
      cleaned = cleaned.substring(0, cleaned.length - 1);
    }
    _server = cleaned.isEmpty ? defaultServer : cleaned;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_serverKey, _server);
  }

  Future<String> deviceId() async {
    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString(_deviceKey);
    if (id == null || id.isEmpty) {
      id = _uuid();
      await prefs.setString(_deviceKey, id);
    }
    return id;
  }

  static String _uuid() {
    // RFC 4122 v4 — good enough for a per-device anonymous id
    final rnd = Random.secure();
    final b = List<int>.generate(16, (_) => rnd.nextInt(256));
    b[6] = (b[6] & 0x0f) | 0x40; // version 4
    b[8] = (b[8] & 0x3f) | 0x80; // variant 10
    final hex = b.map((x) => x.toRadixString(16).padLeft(2, '0')).join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-'
        '${hex.substring(16, 20)}-${hex.substring(20)}';
  }

  Uri _uri(String path) => Uri.parse('$_server$path');

  Future<ChatConfig> fetchConfig() async {
    if (_server.isEmpty) await load(); // first use before the widget's load() finishes
    final res = await http.get(_uri('/api/chat/config')).timeout(const Duration(seconds: 12));
    if (res.statusCode != 200) {
      throw BlossomServerException('Could not reach the companion server at $_server.');
    }
    return ChatConfig.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  /// POST /api/chat — sends the last few turns + live context, returns the
  /// baby's reply. Red-line safety and daily caps are enforced server-side.
  Future<String> sendChat({
    required List<ChatTurn> messages,
    required ChatContext context,
  }) async {
    if (_server.isEmpty) await load(); // first use before the widget's load() finishes
    final res = await http
        .post(
          _uri('/api/chat'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'deviceId': await deviceId(),
            'messages': messages.map((m) => m.toJson()).toList(),
            'context': context.toJson(),
          }),
        )
        .timeout(const Duration(seconds: 45));
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      throw BlossomServerException(
        (data['error'] as String?) ??
            'The little one got distracted — please try again in a moment.',
        code: data['code'] as String?,
      );
    }
    final reply = (data['reply'] as String?)?.trim() ?? '';
    if (reply.isEmpty) {
      throw const BlossomServerException('The little one got distracted — please try again.');
    }
    return reply;
  }
}

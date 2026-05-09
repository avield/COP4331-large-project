import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:web_socket_channel/io.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../utils/get_api.dart';
import '../utils/token_service.dart';
import '../utils/url_utils.dart';

class ProjectChatScreen extends StatefulWidget {
  final String projectId;
  final String projectName;
  final String currentUserId;
  final List<Map<String, dynamic>> members;

  const ProjectChatScreen({
    super.key,
    required this.projectId,
    required this.projectName,
    required this.currentUserId,
    required this.members,
  });

  @override
  State<ProjectChatScreen> createState() => _ProjectChatScreenState();
}

class _ProjectChatScreenState extends State<ProjectChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<Map<String, dynamic>> _messages = [];
  final Set<String> _selectedMentionIds = {};

  WebSocketChannel? _channel;
  StreamSubscription? _subscription;
  bool _isLoading = true;
  bool _isConnected = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _messageController.addListener(_handleDraftChanged);
    _loadMessages();
    _connectSocket();
  }

  @override
  void dispose() {
    _messageController.removeListener(_handleDraftChanged);
    _messageController.dispose();
    _scrollController.dispose();
    _subscription?.cancel();
    _channel?.sink.close();
    super.dispose();
  }

  List<Map<String, dynamic>> get _mentionableMembers {
    return widget.members
        .where((member) => (member['membershipStatus'] ?? 'active').toString() == 'active')
        .where((member) => member['userId'] != null)
        .map((member) => Map<String, dynamic>.from(member['userId'] as Map))
        .toList();
  }

  String? get _activeMentionQuery {
    final match = RegExp(r'(^|\s)@([^\s@]*)$').firstMatch(_messageController.text);
    return match?.group(2)?.toLowerCase();
  }

  List<Map<String, dynamic>> get _mentionSuggestions {
    final query = _activeMentionQuery;
    if (query == null) return [];

    return _mentionableMembers.where((user) {
      final name = _displayName(user).toLowerCase();
      final email = (user['email'] ?? '').toString().toLowerCase();
      return name.contains(query) || email.contains(query);
    }).take(6).toList();
  }

  void _handleDraftChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _loadMessages() async {
    try {
      final response = await TaskManagerData.projectChatMessages(widget.projectId);
      final decoded = json.decode(response);
      if (!mounted) return;

      setState(() {
        _messages
          ..clear()
          ..addAll(
            (decoded as List)
                .whereType<Map>()
                .map((message) => Map<String, dynamic>.from(message)),
          );
        _isLoading = false;
      });
      _scrollToBottom();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  Future<void> _connectSocket() async {
    final token = await TokenService.getToken();
    if (token == null || token.isEmpty) {
      if (mounted) setState(() => _isConnected = false);
      return;
    }

    final uri = Uri.parse(
      'wss://taskademia.app/ws/projects/${widget.projectId}/chat?token=${Uri.encodeComponent(token)}',
    );

    try {
      final channel = IOWebSocketChannel.connect(uri);
      _channel = channel;

      _subscription = channel.stream.listen(
        (event) {
          final payload = json.decode(event.toString());
          if (payload is! Map) return;

          if (payload['type'] == 'chat:ready') {
            if (mounted) setState(() => _isConnected = true);
            return;
          }

          if (payload['type'] == 'chat:message' && payload['message'] is Map) {
            final message = Map<String, dynamic>.from(payload['message'] as Map);
            if (mounted) {
              setState(() {
                if (!_messages.any((existing) => existing['_id'] == message['_id'])) {
                  _messages.add(message);
                }
              });
              _scrollToBottom();
            }
          }

          if (payload['type'] == 'chat:error' && mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text((payload['message'] ?? 'Unable to send message.').toString())),
            );
          }
        },
        onDone: () {
          if (mounted) setState(() => _isConnected = false);
        },
        onError: (_) {
          if (mounted) setState(() => _isConnected = false);
        },
      );
    } catch (_) {
      if (mounted) setState(() => _isConnected = false);
    }
  }

  void _selectMention(Map<String, dynamic> user) {
    final id = (user['_id'] ?? user['id'] ?? '').toString();
    final name = _displayName(user);
    final text = _messageController.text;
    _messageController.text = text.replaceFirst(RegExp(r'(^|\s)@([^\s@]*)$'), ' @$name ');
    _messageController.selection = TextSelection.collapsed(offset: _messageController.text.length);

    if (id.isNotEmpty) {
      _selectedMentionIds.add(id);
    }
    setState(() {});
  }

  Set<String> _mentionIdsFromDraft() {
    final draft = _messageController.text.toLowerCase();
    final inferred = _mentionableMembers
        .where((user) => draft.contains('@${_displayName(user).toLowerCase()}'))
        .map((user) => (user['_id'] ?? user['id'] ?? '').toString())
        .where((id) => id.isNotEmpty);

    return {..._selectedMentionIds, ...inferred};
  }

  void _sendMessage() {
    final text = _messageController.text.trim();
    final channel = _channel;

    if (text.isEmpty || !_isConnected || channel == null) return;

    channel.sink.add(json.encode({
      'type': 'chat:message',
      'content': text,
      'mentionedUserIds': _mentionIdsFromDraft().toList(),
    }));

    _messageController.clear();
    _selectedMentionIds.clear();
    setState(() {});
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  String _displayName(dynamic user) {
    if (user is Map) {
      final profile = user['profile'];
      if (profile is Map && profile['displayName'] != null) {
        return profile['displayName'].toString();
      }
      return (user['displayName'] ?? user['username'] ?? user['email'] ?? 'User').toString();
    }
    return 'User';
  }

  String? _profilePictureUrl(dynamic user) {
    if (user is Map) {
      final profile = user['profile'];
      if (profile is Map && profile['profilePictureUrl'] != null) {
        return profile['profilePictureUrl']?.toString();
      }
      return user['profilePictureUrl']?.toString();
    }
    return null;
  }

  Widget _avatar(dynamic user, {double radius = 18}) {
    final name = _displayName(user);
    final imageUrl = UrlUtils.getFullUrl(_profilePictureUrl(user));

    return CircleAvatar(
      radius: radius,
      backgroundColor: Colors.blue.withValues(alpha: 0.12),
      child: ClipOval(
        child: imageUrl.isNotEmpty
            ? Image.network(
                imageUrl,
                width: radius * 2,
                height: radius * 2,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Text(
                  name.isNotEmpty ? name[0].toUpperCase() : '?',
                  style: const TextStyle(color: Colors.blue, fontWeight: FontWeight.bold),
                ),
              )
            : Text(
                name.isNotEmpty ? name[0].toUpperCase() : '?',
                style: const TextStyle(color: Colors.blue, fontWeight: FontWeight.bold),
              ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final suggestions = _mentionSuggestions;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Project Chat', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            Text(
              widget.projectName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Row(
              children: [
                Icon(
                  _isConnected ? LucideIcons.wifi : LucideIcons.wifiOff,
                  size: 16,
                  color: _isConnected ? Colors.green : Colors.grey,
                ),
                const SizedBox(width: 6),
                Text(
                  _isConnected ? 'Live' : 'Offline',
                  style: TextStyle(fontSize: 12, color: _isConnected ? Colors.green : Colors.grey),
                ),
              ],
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _errorMessage != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Text(_errorMessage!, textAlign: TextAlign.center),
                        ),
                      )
                    : _messages.isEmpty
                        ? const Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(LucideIcons.messagesSquare, color: Colors.grey),
                                SizedBox(height: 8),
                                Text('No messages yet.', style: TextStyle(color: Colors.grey)),
                              ],
                            ),
                          )
                        : ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.all(16),
                            itemCount: _messages.length,
                            itemBuilder: (context, index) => _buildMessageBubble(_messages[index], isDark),
                          ),
          ),
          if (suggestions.isNotEmpty)
            Container(
              constraints: const BoxConstraints(maxHeight: 190),
              margin: const EdgeInsets.fromLTRB(12, 0, 12, 8),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: suggestions.length,
                itemBuilder: (context, index) {
                  final user = suggestions[index];
                  return ListTile(
                    dense: true,
                    leading: _avatar(user, radius: 16),
                    title: Text(_displayName(user), style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text((user['email'] ?? '').toString(), maxLines: 1, overflow: TextOverflow.ellipsis),
                    onTap: () => _selectMention(user),
                  );
                },
              ),
            ),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF121212) : Colors.white,
                border: Border(top: BorderSide(color: isDark ? Colors.white10 : Colors.grey.shade200)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      minLines: 1,
                      maxLines: 4,
                      maxLength: 2000,
                      decoration: InputDecoration(
                        counterText: '',
                        hintText: 'Message the project...',
                        prefixIcon: const Icon(LucideIcons.atSign, size: 18),
                        filled: true,
                        fillColor: isDark ? Colors.white.withValues(alpha: 0.05) : Colors.grey.shade100,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    height: 48,
                    width: 48,
                    child: ElevatedButton(
                      onPressed: _isConnected && _messageController.text.trim().isNotEmpty ? _sendMessage : null,
                      style: ElevatedButton.styleFrom(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        padding: EdgeInsets.zero,
                        backgroundColor: Colors.blue.shade700,
                        foregroundColor: Colors.white,
                      ),
                      child: const Icon(LucideIcons.send, size: 18),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(Map<String, dynamic> message, bool isDark) {
    final sender = message['senderId'];
    final senderId = sender is Map ? (sender['_id'] ?? sender['id'] ?? '').toString() : '';
    final isMine = senderId == widget.currentUserId;
    final senderName = _displayName(sender);
    final createdAt = DateTime.tryParse((message['createdAt'] ?? '').toString())?.toLocal();
    final timeText = createdAt == null ? '' : TimeOfDay.fromDateTime(createdAt).format(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisAlignment: isMine ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!isMine) ...[
            _avatar(sender),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: isMine ? Colors.blue.shade700 : (isDark ? const Color(0xFF1E1E1E) : Colors.grey.shade100),
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isMine ? 16 : 4),
                  bottomRight: Radius.circular(isMine ? 4 : 16),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        isMine ? 'You' : senderName,
                        style: TextStyle(
                          color: isMine ? Colors.white70 : Colors.grey,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (timeText.isNotEmpty) ...[
                        const SizedBox(width: 8),
                        Text(
                          timeText,
                          style: TextStyle(color: isMine ? Colors.white60 : Colors.grey, fontSize: 11),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    (message['content'] ?? '').toString(),
                    style: TextStyle(
                      color: isMine ? Colors.white : (isDark ? Colors.white : Colors.black87),
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

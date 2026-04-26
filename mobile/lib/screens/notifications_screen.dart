import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../utils/get_api.dart';
import '../utils/url_utils.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool _isLoading = true;
  bool _isApplyingBulkAction = false;
  String errorMessage = '';
  List<dynamic> notifications = [];

  Widget _buildNotificationAvatar(String name, String? profilePictureUrl) {
    final fullUrl = UrlUtils.getFullUrl(profilePictureUrl);
    final fallbackText = name.isNotEmpty ? name[0].toUpperCase() : '?';

    return CircleAvatar(
      radius: 20,
      backgroundColor: Colors.blue.shade50,
      child: ClipOval(
        child: fullUrl.isNotEmpty
            ? Image.network(
                fullUrl,
                width: 40,
                height: 40,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Center(child: Text(fallbackText)),
              )
            : Center(child: Text(fallbackText)),
      ),
    );
  }

  List<dynamic> _extractNotifications(dynamic decoded) {
    if (decoded is List) return decoded;
    if (decoded is Map<String, dynamic>) {
      final items = decoded['notifications'];
      if (items is List) return items;
    }
    return [];
  }

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    setState(() => _isLoading = true);
    try {
      String response = await TaskManagerData.notifications();
      final decoded = json.decode(response);
      if (!mounted) return;
      setState(() {
        notifications = _extractNotifications(decoded);
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          errorMessage = e.toString().replaceAll("Exception: ", "");
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleAction(String membershipId, bool accept) async {
    try {
      if (accept) {
        await TaskManagerData.notificationAccept(membershipId);
      } else {
        await TaskManagerData.notificationReject(membershipId);
      }
      _fetchNotifications();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _deleteNotification(String notificationId) async {
    try {
      await TaskManagerData.notificationDelete(notificationId);
      await _fetchNotifications();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceAll("Exception: ", "")), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _markAllRead() async {
    setState(() => _isApplyingBulkAction = true);
    try {
      await TaskManagerData.notificationMarkAllRead();
      await _fetchNotifications();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceAll("Exception: ", "")), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isApplyingBulkAction = false);
    }
  }

  Future<void> _clearAll() async {
    setState(() => _isApplyingBulkAction = true);
    try {
      await TaskManagerData.notificationClearAll();
      await _fetchNotifications();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceAll("Exception: ", "")), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isApplyingBulkAction = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text("Alerts", style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
        backgroundColor: Colors.transparent,
        actions: [
          if (notifications.isNotEmpty) ...[
            TextButton(
              onPressed: _isApplyingBulkAction ? null : _markAllRead,
              child: const Text("Mark all read"),
            ),
            TextButton(
              onPressed: _isApplyingBulkAction ? null : _clearAll,
              child: const Text("Clear all"),
            ),
          ],
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchNotifications,
        child: _isLoading 
          ? const Center(child: CircularProgressIndicator())
          : notifications.isEmpty 
            ? _buildEmptyState(isDark)
            : _buildNotificationList(isDark),
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(LucideIcons.bellOff, size: 64, color: isDark ? Colors.white10 : Colors.grey.shade200),
          const SizedBox(height: 16),
          Text("No New Notifications", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: isDark ? Colors.white70 : Colors.grey.shade800)),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40),
            child: Text(
              "You're all caught up! Project invitations and system alerts will appear here.",
              textAlign: TextAlign.center,
              style: TextStyle(color: isDark ? Colors.white38 : Colors.grey.shade500),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationList(bool isDark) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: notifications.length,
      itemBuilder: (context, index) {
        final n = notifications[index];
        final actor = n["actorUserId"] ?? n["joinedBy"] ?? {};
        final profile = actor["profile"] ?? actor;
        final name = profile["displayName"] ?? actor["email"] ?? "Someone";
        final pfp = profile["profilePictureUrl"] ?? actor["profilePictureUrl"];
        final project = n["projectId"];
        final projectName = project is Map ? (project["name"] ?? "Unknown Project") : "Unknown Project";
        final notificationType = n["type"]?.toString() ?? "";
        final notificationId = n["_id"]?.toString() ?? "";
        final membershipId = n["projectMemberId"]?.toString();
        final isInvitation = notificationType == "project_invitation" && membershipId != null && membershipId.isNotEmpty;
        final title = (n["title"]?.toString().trim().isNotEmpty ?? false)
            ? n["title"].toString()
            : "$name invited you to join $projectName.";
        final message = (n["message"]?.toString().trim().isNotEmpty ?? false)
            ? n["message"].toString()
            : "Project notifications and updates will appear here.";

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1A1A1A) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade100),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _buildNotificationAvatar(name, pfp),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        RichText(
                          text: TextSpan(
                            style: TextStyle(color: isDark ? Colors.white : Colors.black87, fontSize: 14),
                            children: [
                              TextSpan(text: title, style: const TextStyle(fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          message,
                          style: TextStyle(fontSize: 12, color: isDark ? Colors.white60 : Colors.grey.shade700),
                        ),
                        if (projectName.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            projectName,
                            style: TextStyle(fontSize: 12, color: isDark ? Colors.white38 : Colors.grey),
                          ),
                        ],
                      ],
                    ),
                  ),
                  if (notificationId.isNotEmpty)
                    IconButton(
                      onPressed: () => _deleteNotification(notificationId),
                      icon: Icon(LucideIcons.x, size: 18, color: isDark ? Colors.white54 : Colors.grey.shade600),
                    ),
                ],
              ),
              if (isInvitation) ...[
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => _handleAction(membershipId, true),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue.shade700,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text("Accept"),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _handleAction(membershipId, false),
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(color: isDark ? Colors.white10 : Colors.grey.shade300),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: Text("Decline", style: TextStyle(color: isDark ? Colors.white60 : Colors.grey.shade700)),
                      ),
                    ),
                  ],
                ),
              ]
            ],
          ),
        );
      },
    );
  }
}

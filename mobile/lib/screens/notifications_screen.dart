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
  String errorMessage = '';
  List<dynamic> notifications = [];

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    setState(() => _isLoading = true);
    try {
      String response = await TaskManagerData.notifications();
      if (!mounted) return;
      setState(() {
        notifications = json.decode(response);
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

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text("Alerts", style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
        backgroundColor: Colors.transparent,
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
        final sender = n["joinedBy"] ?? {};
        final profile = sender["profile"] ?? {};
        final name = profile["displayName"] ?? sender["email"] ?? "Someone";
        final pfp = profile["profilePictureUrl"];
        final projectId = n["projectId"];

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
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: Colors.blue.shade50,
                    backgroundImage: (pfp != null && pfp.isNotEmpty) 
                        ? NetworkImage(UrlUtils.getFullUrl(pfp)) 
                        : null,
                    child: (pfp == null || pfp.isEmpty) ? Text(name[0].toUpperCase()) : null,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        RichText(
                          text: TextSpan(
                            style: TextStyle(color: isDark ? Colors.white : Colors.black87, fontSize: 14),
                            children: [
                              TextSpan(text: name, style: const TextStyle(fontWeight: FontWeight.bold)),
                              const TextSpan(text: " invited you to join a project."),
                            ],
                          ),
                        ),
                        Text("Project ID: ${projectId.toString().substring(0, 8)}...", 
                          style: TextStyle(fontSize: 12, color: isDark ? Colors.white38 : Colors.grey)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => _handleAction(n["_id"], true),
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
                      onPressed: () => _handleAction(n["_id"], false),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: isDark ? Colors.white10 : Colors.grey.shade300),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: Text("Decline", style: TextStyle(color: isDark ? Colors.white60 : Colors.grey.shade700)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

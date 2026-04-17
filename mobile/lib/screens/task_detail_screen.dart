import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../utils/get_api.dart';
import '../utils/url_utils.dart';

class TaskDetailScreen extends StatefulWidget {
  final String taskId;
  final String? projectId;
  final Map<String, dynamic>? initialData;
  final List<dynamic> projectMembers;

  const TaskDetailScreen({
    super.key,
    required this.taskId,
    this.projectId,
    this.initialData,
    this.projectMembers = const [],
  });

  @override
  State<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends State<TaskDetailScreen> {
  bool _isLoading = true;
  bool _isAdmin = false;
  Map<String, dynamic>? _task;
  Map<String, dynamic>? _project;
  List<dynamic> _members = [];
  
  late TextEditingController _titleController;
  late TextEditingController _descController;
  final TextEditingController _commentController = TextEditingController();

  final List<Map<String, dynamic>> _dummyComments = [
    {"user": "Alex", "text": "I'll start working on the UI implementation today.", "time": "2h ago"},
    {"user": "Jordan", "text": "Make sure to follow the new design system guidelines.", "time": "1h ago"},
  ];

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.initialData?['title'] ?? '');
    _descController = TextEditingController(text: widget.initialData?['description'] ?? '');
    _members = widget.projectMembers;
    _fetchAllData();
  }

  Future<void> _fetchAllData() async {
    try {
      // 1. Fetch Task
      final taskRes = await TaskManagerData.tasksById(widget.taskId);
      final taskData = json.decode(taskRes);
      
      // 2. Fetch Project (if ID available) to check permissions
      String? pId = widget.projectId ?? taskData['projectId']?['_id'] ?? taskData['projectId'];
      if (pId != null) {
        final projRes = await TaskManagerData.projectDetails(pId);
        _project = json.decode(projRes);
        _members = _project?['members'] ?? [];
        
        // 3. Check Admin Status
        final meRes = await TaskManagerData.me();
        final myId = (json.decode(meRes)['user']?['_id'] ?? json.decode(meRes)['user']?['id']).toString();
        
        final owner = _project?['project']?['owner'] ?? _project?['project']?['createdBy'];
        final ownerId = (owner is Map ? owner['_id'] : owner).toString();
        
        if (myId == ownerId) {
          _isAdmin = true;
        } else {
          // Check if admin in members list
          for (var m in _members) {
            final mId = (m['userId'] is Map ? m['userId']['_id'] : m['userId']).toString();
            if (mId == myId && (m['role'] == 'admin' || m['role'] == 'owner')) {
              _isAdmin = true;
              break;
            }
          }
        }
      }

      if (!mounted) return;
      setState(() {
        _task = taskData;
        _titleController.text = _task?['title'] ?? '';
        _descController.text = _task?['description'] ?? '';
        _isLoading = false;
      });
    } catch (e) {
      debugPrint("Error fetching task details: $e");
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _updateTask(Map<String, dynamic> data) async {
    try {
      final response = await TaskManagerData.tasksByIdUpdate(widget.taskId, data);
      setState(() {
        _task = json.decode(response);
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Update failed: $e")));
    }
  }

  Future<void> _deleteTask() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E1E1E),
        title: const Text("Delete Task?", style: TextStyle(color: Colors.white)),
        content: const Text("This action cannot be undone.", style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("Cancel")),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text("Delete", style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    
    if (confirm == true) {
      try {
        await TaskManagerData.tasksByIdDelete(widget.taskId);
        if (mounted) Navigator.pop(context, "deleted");
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Delete failed: $e")));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_task == null) return const Scaffold(body: Center(child: Text("Task not found")));

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accentColor = Colors.blue.shade400;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0D0D0D) : Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.chevronLeft),
          onPressed: () => Navigator.pop(context, _task),
        ),
        title: Text(_project?['project']?['name'] ?? "Task Details", 
          style: TextStyle(fontSize: 14, color: isDark ? Colors.white38 : Colors.grey.shade600, fontWeight: FontWeight.w600)),
        actions: [
          if (_isAdmin)
            TextButton(
              onPressed: () => _updateTask({
                "title": _titleController.text,
                "description": _descController.text,
              }),
              child: const Text("Save", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title
            TextField(
              controller: _titleController,
              enabled: _isAdmin,
              style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, letterSpacing: -0.5),
              decoration: const InputDecoration(border: InputBorder.none, hintText: "Task Title", contentPadding: EdgeInsets.zero),
            ),
            const SizedBox(height: 16),

            // Metadata Row
            Row(
              children: [
                _buildStatusPicker(accentColor, isDark),
                const SizedBox(width: 12),
                _buildPriorityPicker(isDark),
              ],
            ),
            const SizedBox(height: 24),

            // Goal Information
            if (_task?['goalId'] != null) _buildGoalChip(isDark),

            const SizedBox(height: 24),
            const Text("DESCRIPTION", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1.2)),
            const SizedBox(height: 8),
            TextField(
              controller: _descController,
              enabled: _isAdmin,
              maxLines: null,
              style: TextStyle(fontSize: 15, height: 1.5, color: isDark ? Colors.white70 : Colors.black87),
              decoration: InputDecoration(
                hintText: "Add more details about this task...",
                hintStyle: TextStyle(color: isDark ? Colors.white10 : Colors.grey.shade300),
                border: InputBorder.none,
              ),
            ),
            
            const SizedBox(height: 32),
            _buildAssigneesSection(isDark),
            
            const SizedBox(height: 40),
            const Text("ACTIVITY", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1.2)),
            const SizedBox(height: 16),
            _buildCommentsList(isDark),
            const SizedBox(height: 20),
            _buildCommentInput(isDark),
            
            const SizedBox(height: 60),
            if (_isAdmin)
              SizedBox(
                width: double.infinity,
                child: TextButton.icon(
                  onPressed: _deleteTask,
                  icon: const Icon(LucideIcons.trash2, size: 18, color: Colors.redAccent),
                  label: const Text("Delete Task", style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.all(16),
                    backgroundColor: Colors.red.withOpacity(0.05),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusPicker(Color accentColor, bool isDark) {
    String status = _task?['status'] ?? 'todo';
    Color color = _getStatusColor(status);
    
    return InkWell(
      onTap: () => _showPicker("Set Status", ["todo", "in-progress", "review", "done"], (val) => _updateTask({"status": val})),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Row(
          children: [
            Icon(LucideIcons.circleDot, size: 14, color: color),
            const SizedBox(width: 8),
            Text(status.toUpperCase(), style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11)),
            const SizedBox(width: 4),
            Icon(LucideIcons.chevronDown, size: 12, color: color.withOpacity(0.5)),
          ],
        ),
      ),
    );
  }

  Widget _buildPriorityPicker(bool isDark) {
    String priority = _task?['priority'] ?? 'medium';
    Color color = _getPriorityColor(priority);

    return InkWell(
      onTap: () => _showPicker("Set Priority", ["low", "medium", "high"], (val) => _updateTask({"priority": val})),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Row(
          children: [
            Icon(LucideIcons.flag, size: 14, color: color),
            const SizedBox(width: 8),
            Text(priority.toUpperCase(), style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11)),
            const SizedBox(width: 4),
            Icon(LucideIcons.chevronDown, size: 12, color: color.withOpacity(0.5)),
          ],
        ),
      ),
    );
  }

  Widget _buildGoalChip(bool isDark) {
    String goalId = _task?['goalId'] is Map ? _task!['goalId']['_id'] : _task!['goalId'];
    String goalTitle = "Associated Goal";
    
    if (_project != null && _project!['goals'] != null) {
      final goals = _project!['goals'] as List;
      final goal = goals.firstWhere((g) => g['_id'] == goalId, orElse: () => null);
      if (goal != null) goalTitle = goal['title'];
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1A1A) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Icon(LucideIcons.target, size: 16, color: Colors.blue.shade400),
          const SizedBox(width: 12),
          Expanded(child: Text(goalTitle, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }

  Widget _buildAssigneesSection(bool isDark) {
    final List assignees = _task?['assignedTo'] ?? [];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("ASSIGNED TO", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1.2)),
        const SizedBox(height: 12),
        Wrap(
          spacing: -8,
          children: [
            ...assignees.map((u) {
              final pfp = u['profile']?['profilePictureUrl'] ?? u['profilePictureUrl'];
              return Tooltip(
                message: u['displayName'] ?? 'User',
                child: CircleAvatar(
                  radius: 18,
                  backgroundColor: isDark ? const Color(0xFF262626) : Colors.white,
                  child: CircleAvatar(
                    radius: 16,
                    backgroundImage: pfp != null ? NetworkImage(UrlUtils.getFullUrl(pfp)) : null,
                    child: pfp == null ? Text(u['displayName']?[0] ?? '?', style: const TextStyle(fontSize: 12)) : null,
                  ),
                ),
              );
            }),
            if (_isAdmin)
              GestureDetector(
                onTap: _showAssigneePicker,
                child: CircleAvatar(
                  radius: 18,
                  backgroundColor: Colors.blue.shade700,
                  child: const Icon(LucideIcons.plus, size: 16, color: Colors.white),
                ),
              ),
          ],
        ),
      ],
    );
  }

  Widget _buildCommentsList(bool isDark) {
    return Column(
      children: _dummyComments.map((c) => Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(radius: 14, backgroundColor: Colors.blue.withOpacity(0.1), child: Text(c['user'][0], style: const TextStyle(fontSize: 10))),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(c['user'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(width: 8),
                      Text(c['time'], style: const TextStyle(color: Colors.grey, fontSize: 11)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(c['text'], style: TextStyle(color: isDark ? Colors.white70 : Colors.black87, fontSize: 13)),
                ],
              ),
            ),
          ],
        ),
      )).toList(),
    );
  }

  Widget _buildCommentInput(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1A1A) : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade200),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: TextField(
              controller: _commentController,
              maxLines: 4,
              minLines: 1,
              style: const TextStyle(fontSize: 14),
              decoration: const InputDecoration(hintText: "Write a comment...", border: InputBorder.none),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(LucideIcons.send, size: 20),
            color: Colors.blue.shade600,
            onPressed: () {
              if (_commentController.text.isNotEmpty) {
                setState(() {
                  _dummyComments.add({"user": "Me", "text": _commentController.text, "time": "Just now"});
                  _commentController.clear();
                });
              }
            },
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'done': return Colors.green;
      case 'in-progress': return Colors.blue;
      case 'review': return Colors.orange;
      default: return Colors.grey;
    }
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'high': return Colors.redAccent;
      case 'medium': return Colors.orangeAccent;
      case 'low': return Colors.greenAccent;
      default: return Colors.grey;
    }
  }

  void _showPicker(String title, List<String> options, Function(String) onSelect) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1A1A1A),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
          ),
          ...options.map((o) => ListTile(
            title: Text(o.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
            onTap: () {
              onSelect(o);
              Navigator.pop(context);
            },
          )),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  void _showAssigneePicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1A1A1A),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => ListView(
        shrinkWrap: true,
        padding: const EdgeInsets.all(20),
        children: [
          const Text("Assign Member", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
          const SizedBox(height: 16),
          ..._members.map((m) {
            final user = m['userId'];
            if (user == null) return const SizedBox();
            final name = user['displayName'] ?? user['email'] ?? 'User';
            final pfp = user['profilePictureUrl'];
            
            return ListTile(
              leading: CircleAvatar(
                backgroundImage: pfp != null ? NetworkImage(UrlUtils.getFullUrl(pfp)) : null,
                child: pfp == null ? Text(name[0]) : null,
              ),
              title: Text(name, style: const TextStyle(color: Colors.white)),
              onTap: () {
                final List currentIds = (_task?['assignedTo'] as List? ?? []).map((e) => e['_id']).toList();
                final String targetId = (user['_id'] ?? user['id']).toString();
                if (!currentIds.contains(targetId)) {
                  currentIds.add(targetId);
                  _updateTask({"assignedToUserIds": currentIds});
                }
                Navigator.pop(context);
              },
            );
          }),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../utils/get_api.dart';
import '../utils/url_utils.dart';
import '../routes/routes.dart';
import 'project_chat_screen.dart';

class ProjectsScreen extends StatefulWidget {
  final String projectId;

  const ProjectsScreen({super.key, required this.projectId});

  @override
  State<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends State<ProjectsScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ProjectsMainPage(projectId: widget.projectId),
    );
  }
}

class ProjectsMainPage extends StatefulWidget {
  final String projectId;
  const ProjectsMainPage({super.key, required this.projectId});
  @override
  _ProjectsMainPageState createState() => _ProjectsMainPageState();
}

class TaskGoal {
  final String id;
  final String title;
  TaskGoal({required this.id, required this.title});
  factory TaskGoal.fromJson(Map<String, dynamic> json) => TaskGoal(id: json['_id'] ?? '', title: json['title'] ?? '');

  factory TaskGoal.fromDynamic(dynamic value) {
    if (value is Map<String, dynamic>) {
      return TaskGoal.fromJson(value);
    }
    if (value is Map) {
      return TaskGoal.fromJson(Map<String, dynamic>.from(value));
    }
    if (value == null) {
      return TaskGoal(id: '', title: 'No Goal');
    }
    return TaskGoal(id: value.toString(), title: 'Associated Goal');
  }
}

class ProjectTask {
  final String id;
  final String title;
  final String status;
  final String description;
  final String priority;
  final TaskGoal goal;
  final Map<String, dynamic> rawJson;

  ProjectTask({
    required this.id,
    required this.title,
    required this.status,
    required this.description,
    required this.priority,
    required this.goal,
    required this.rawJson,
  });

  factory ProjectTask.fromJson(Map<String, dynamic> json) => ProjectTask(
    id: json['_id'] ?? '',
    title: json['title'] ?? 'Untitled Task',
    status: json['status'] ?? 'todo',
    description: json['description'] ?? '',
    priority: json['priority'] ?? 'low',
    goal: TaskGoal.fromDynamic(json['goalId']),
    rawJson: json,
  );
}

class _ProjectsMainPageState extends State<ProjectsMainPage> {
  String errorMessage = '';
  bool _isLoading = true;
  bool _isMember = false;
  bool _canEdit = false;
  bool _isAdmin = false; // Added for administrative actions
  bool _isRequesting = false;
  String currentUserId = '';
  String projectName = '', projectPrivacy = '', projectRecruiting = '', projectStatus = '';
  String description = '';
  String projectDueDate = '', projectVisibility = '';
  List<String> projectTags = [];
  List<String> lookingForRoles = [];
  Map<String, dynamic> joinSettings = {};
  int taskToDo = 0, taskInProgress = 0, taskBlocked = 0, taskDone = 0, taskTotal = 0;
  List<Map<String, dynamic>> membersList = [];
  List<ProjectTask> todo = [], inProgress = [], review = [], done = [];
  List<Map<String, dynamic>> goalsList = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  String _normalizeTaskStatus(dynamic status) {
    final normalized = (status ?? 'todo').toString().toLowerCase();
    switch (normalized) {
      case 'in-progress':
        return 'in_progress';
      case 'review':
        return 'blocked';
      default:
        return normalized;
    }
  }

  Widget _buildAvatarImage({
    required String displayName,
    String? imageUrl,
    required double radius,
    Color? backgroundColor,
    Color? textColor,
    FontWeight? fontWeight,
    double? fontSize,
  }) {
    final resolvedUrl = UrlUtils.getFullUrl(imageUrl);
    final fallbackText = displayName.isNotEmpty ? displayName[0].toUpperCase() : '?';

    return CircleAvatar(
      radius: radius,
      backgroundColor: backgroundColor,
      child: ClipOval(
        child: resolvedUrl.isNotEmpty
            ? Image.network(
                resolvedUrl,
                width: radius * 2,
                height: radius * 2,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Center(
                  child: Text(
                    fallbackText,
                    style: TextStyle(
                      color: textColor,
                      fontSize: fontSize,
                      fontWeight: fontWeight,
                    ),
                  ),
                ),
              )
            : Center(
                child: Text(
                  fallbackText,
                  style: TextStyle(
                    color: textColor,
                    fontSize: fontSize,
                    fontWeight: fontWeight,
                  ),
                ),
              ),
      ),
    );
  }

  void _applyTaskData(List<dynamic> rawTasks) {
    final tasks = rawTasks
        .whereType<Map<String, dynamic>>()
        .map((item) => ProjectTask.fromJson({
              ...item,
              'status': _normalizeTaskStatus(item['status']),
            }))
        .toList();

    todo = tasks.where((t) => t.status == 'todo').toList();
    inProgress = tasks.where((t) => t.status == 'in_progress').toList();
    review = tasks.where((t) => t.status == 'blocked').toList();
    done = tasks.where((t) => t.status == 'done').toList();

    taskTotal = tasks.length;
    taskToDo = todo.length;
    taskInProgress = inProgress.length;
    taskBlocked = review.length;
    taskDone = done.length;
  }

  String _memberDisplayName(dynamic user) {
    if (user is Map) {
      final profile = user["profile"];
      if (profile is Map && profile["displayName"] != null) {
        return profile["displayName"].toString();
      }
      return (user["displayName"] ?? user["email"] ?? "User").toString();
    }
    return "User";
  }

  String? _memberProfilePictureUrl(dynamic user) {
    if (user is Map) {
      final profile = user["profile"];
      if (profile is Map && profile["profilePictureUrl"] != null) {
        return profile["profilePictureUrl"]?.toString();
      }
      return user["profilePictureUrl"]?.toString();
    }
    return null;
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    await _initProject(widget.projectId);
    if (_isMember) {
      await _initTasks(widget.projectId);
    }
    setState(() => _isLoading = false);
  }

  Future<void> _initProject(String projectId) async {
    try {
      // 1. Get current user ID
      final meRes = await TaskManagerData.me();
      final meJson = json.decode(meRes);
      final userData = meJson["user"] ?? meJson;
      final myId = (userData["_id"] ?? userData["id"] ?? '').toString();
      currentUserId = myId;

      // 2. Get project details
      String response = await TaskManagerData.projectDetails(projectId);
      var jsonObject = json.decode(response);
      if (!mounted) return;
      
      final projectObj = jsonObject["project"] ?? {};
      final List<dynamic> detailMembers = jsonObject["members"] ?? [];
      final List<dynamic> projectTasks = jsonObject["tasks"] ?? [];
      
      // 3. Determine Membership and Role
      bool memberFound = false;
      bool canEdit = false;
      bool isAdmin = false;

      // Check Members list for ID and Role
      for (var m in detailMembers) {
        final mUser = m["userId"];
        String? mId;
        if (mUser is Map) {
          mId = (mUser["_id"] ?? mUser["id"])?.toString();
        } else {
          mId = mUser?.toString();
        }

        if (myId.isNotEmpty && mId == myId) {
          memberFound = true;
          final role = (m["role"] ?? 'member').toString().toLowerCase();
          if (role == 'owner' || role == 'admin' || role == 'member') {
            canEdit = true;
          }
          if (role == 'owner' || role == 'admin') {
            isAdmin = true;
          }
          break;
        }
      }

      // Check Owner/CreatedBy field as fallback
      if (!memberFound) {
        final ownerData = projectObj["owner"] ?? projectObj["createdBy"];
        String? ownerId;
        if (ownerData is Map) {
          ownerId = (ownerData["_id"] ?? ownerData["id"])?.toString();
        } else {
          ownerId = ownerData?.toString();
        }

        if (myId.isNotEmpty && ownerId == myId) {
          memberFound = true;
          canEdit = true;
          isAdmin = true;
        }
      }

      List<Map<String, dynamic>> resolvedMembers = List<Map<String, dynamic>>.from(detailMembers);

      if (memberFound) {
        try {
          final membersResponse = isAdmin
              ? await TaskManagerData.projectMembersManage(projectId)
              : await TaskManagerData.projectMembers(projectId);
          final fetchedMembers = json.decode(membersResponse);
          if (fetchedMembers is List) {
            resolvedMembers = fetchedMembers
                .whereType<Map>()
                .map((member) => Map<String, dynamic>.from(member))
                .toList();
          }
        } catch (_) {
          // Fall back to the members included in project details if the secondary fetch fails.
        }
      }

      setState(() {
        projectName = projectObj["name"] ?? 'Unnamed Project';
        description = projectObj["description"] ?? '';
        projectPrivacy = (projectObj["visibility"] ?? 'public').toString().toLowerCase();
        projectRecruiting = (projectObj["recruitingStatus"] ?? projectObj["recruiting"] ?? 'open').toString().toLowerCase();
        projectStatus = projectObj["status"] ?? '';
        projectDueDate = projectObj["dueDate"]?.toString().split("T")[0] ?? 'No Date';
        projectVisibility = projectPrivacy;
        projectTags = List<String>.from(projectObj["tags"] ?? []);
        lookingForRoles = List<String>.from(projectObj["lookingForRoles"] ?? []);
        joinSettings = Map<String, dynamic>.from(projectObj["settings"] ?? {});
        
        membersList = resolvedMembers;
        goalsList = List<Map<String, dynamic>>.from(jsonObject["goals"] ?? []);
        _applyTaskData(projectTasks);
        
        _isMember = memberFound;
        _canEdit = canEdit;
        _isAdmin = isAdmin;
      });
    } catch (e) {
      if (mounted) setState(() => errorMessage = e.toString());
      print("ERROR in _initProject: $e");
    }
  }

  Future<void> _initTasks(String projectId) async {
    try {
      String response = await TaskManagerData.tasksProject(projectId);
      List<dynamic> jsonList = json.decode(response);
      if (!mounted) return;
      setState(() {
        _applyTaskData(jsonList);
      });
    } catch (e) {
      if (mounted) setState(() => errorMessage = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    // If member, show the Kanban Board layout
    if (_isMember) {
      return _buildMemberDashboard(isDark);
    }

    // If not member, show the Landing/Preview layout
    return _buildPublicLanding(isDark);
  }

  Widget _buildMemberDashboard(bool isDark) {
    // Calculate Progress
    double progress = taskTotal > 0 ? (taskDone / taskTotal) : 0.0;
    int remainingTasks = taskTotal - taskDone;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(projectName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            Text(projectStatus.toUpperCase(), style: TextStyle(fontSize: 10, color: Colors.blue.shade400, letterSpacing: 1)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.messagesSquare, size: 20),
            onPressed: _openProjectChat,
          ),
          if (_canEdit)
            IconButton(
              icon: const Icon(LucideIcons.plus, size: 20),
              onPressed: () => _showAddTaskDialog("todo"),
            ),
          if (_canEdit)
            IconButton(
              icon: const Icon(LucideIcons.settings, size: 20),
              onPressed: _showProjectSettingsSheet,
            ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildProgressCard(isDark, progress, remainingTasks),
            _buildProjectOverviewCard(isDark),
            _buildQuickStats(isDark),
            _buildMembersSection(isDark),
            _buildGoalsSection(isDark),
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 24, 16, 12),
              child: Text("Project Board", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            ),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildKanbanColumn("To Do", todo, isDark ? const Color(0xFF1A1A1A) : Colors.grey.shade100, Colors.grey, "todo"),
                  _buildKanbanColumn("In Progress", inProgress, isDark ? const Color(0xFF1A1A1A) : Colors.blue.shade50, Colors.blue, "in_progress"),
                  _buildKanbanColumn("Blocked", review, isDark ? const Color(0xFF1A1A1A) : Colors.orange.shade50, Colors.orange, "blocked"),
                  _buildKanbanColumn("Done", done, isDark ? const Color(0xFF1A1A1A) : Colors.green.shade50, Colors.green, "done"),
                ],
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  void _openProjectChat() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ProjectChatScreen(
          projectId: widget.projectId,
          projectName: projectName,
          currentUserId: currentUserId,
          members: membersList,
        ),
      ),
    );
  }

  Widget _buildMembersSection(bool isDark) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("Team Members", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey)),
              Row(
                children: [
                  if (_isAdmin)
                    IconButton(
                      icon: const Icon(LucideIcons.userPlus, size: 18, color: Colors.blue),
                      onPressed: _showInviteMemberDialog,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  const SizedBox(width: 8),
                  TextButton(
                    onPressed: _showAllMembersDialog,
                    style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(0, 0), tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                    child: Text("${membersList.length} total", style: const TextStyle(fontSize: 12, color: Colors.blue)),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          InkWell(
            onTap: _showAllMembersDialog,
            borderRadius: BorderRadius.circular(20),
            child: SizedBox(
              height: 40,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: membersList.length > 8 ? 8 : membersList.length,
                itemBuilder: (context, index) {
                  final member = membersList[index]["userId"];
                  final String? imageUrl = _memberProfilePictureUrl(member);
                  final String displayName = _memberDisplayName(member);
                  
                  return Align(
                    widthFactor: 0.7,
                    child: Tooltip(
                      message: displayName,
                      child: CircleAvatar(
                        radius: 20,
                        backgroundColor: isDark ? const Color(0xFF262626) : Colors.white,
                        child: _buildAvatarImage(
                          displayName: displayName,
                          imageUrl: imageUrl,
                          radius: 18,
                          backgroundColor: isDark ? Colors.blue.withOpacity(0.2) : Colors.blue.shade50,
                          textColor: Colors.blue.shade700,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showAllMembersDialog() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.6,
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text("Project Team (${membersList.length})", style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                IconButton(icon: const Icon(LucideIcons.x), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView.builder(
                itemCount: membersList.length,
                itemBuilder: (context, index) {
                  final memberData = membersList[index];
                  final user = memberData["userId"];
                  final String role = memberData["role"] ?? "member";
                  final String membershipId = memberData["_id"]?.toString() ?? "";
                  final String membershipStatus =
                      (memberData["membershipStatus"] ?? "active").toString().toLowerCase();
                  final bool isPending = membershipStatus == 'pending';
                  
                  final String name = _memberDisplayName(user);
                  final String email = (user is Map) ? (user["email"] ?? "") : "";
                  final String? imageUrl = _memberProfilePictureUrl(user);
                  final String mUserId = (user is Map) ? (user["_id"] ?? user["id"]).toString() : user.toString();
                  final joinedBy = memberData["joinedBy"];
                  final String joinedById = joinedBy is Map
                      ? (joinedBy["_id"] ?? joinedBy["id"] ?? "").toString()
                      : (joinedBy?.toString() ?? "");
                  final bool isJoinRequest = isPending && joinedById == mUserId;
                  final String memberSubtitle = isPending
                      ? (isJoinRequest ? "Pending join request" : "Pending invitation")
                      : email;

                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(vertical: 4),
                    leading: _buildAvatarImage(
                      displayName: name,
                      imageUrl: imageUrl,
                      radius: 22,
                      backgroundColor: Colors.blue.shade50,
                      textColor: Colors.blue,
                      fontWeight: FontWeight.bold,
                    ),
                    title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text(
                      memberSubtitle,
                      style: TextStyle(fontSize: 12, color: isDark ? Colors.white60 : Colors.black54),
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: _getRoleColor(role).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            role.toUpperCase(),
                            style: TextStyle(color: _getRoleColor(role), fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: isPending
                                ? Colors.amber.withOpacity(0.14)
                                : Colors.green.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            isPending ? "PENDING" : "ACTIVE",
                            style: TextStyle(
                              color: isPending ? Colors.amber.shade800 : Colors.green.shade700,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        if (_isAdmin && mUserId != currentUserId && role.toLowerCase() != 'owner')
                          PopupMenuButton<String>(
                            icon: const Icon(LucideIcons.ellipsisVertical, size: 18),
                            onSelected: (value) => _handleMemberAction(value, membershipId, name),
                            itemBuilder: (context) => [
                              const PopupMenuItem(value: 'member', child: Text('Set as Member')),
                              const PopupMenuItem(value: 'admin', child: Text('Set as Admin')),
                              const PopupMenuItem(value: 'remove', child: Text('Remove Member', style: TextStyle(color: Colors.red))),
                            ],
                          ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleMemberAction(String action, String membershipId, String name) async {
    try {
      if (action == 'remove') {
        final confirm = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text("Remove $name?"),
            content: const Text("Are you sure you want to remove this member from the project?"),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("Cancel")),
              TextButton(onPressed: () => Navigator.pop(context, true), child: const Text("Remove", style: TextStyle(color: Colors.red))),
            ],
          ),
        );
        if (confirm == true) {
          await TaskManagerData.projectMembersRemove(membershipId);
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Removed $name")));
        }
      } else {
        // Change role
        await TaskManagerData.projectMembersUpdate(membershipId, action, {"canEdit": true});
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Updated $name to $action")));
      }
      _initProject(widget.projectId); // Refresh UI
      Navigator.pop(context); // Close member list
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    }
  }

  Color _getRoleColor(String role) {
    switch (role.toLowerCase()) {
      case 'owner': return Colors.orange;
      case 'admin': return Colors.red;
      default: return Colors.blue;
    }
  }

  void _showInviteMemberDialog() {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final TextEditingController searchController = TextEditingController();
    List<dynamic> searchResults = [];
    bool isSearching = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          height: MediaQuery.of(context).size.height * 0.7,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Invite Members", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(icon: const Icon(LucideIcons.x), onPressed: () => Navigator.pop(context)),
                ],
              ),
              const SizedBox(height: 20),
              TextField(
                controller: searchController,
                decoration: InputDecoration(
                  hintText: "Search by name or email...",
                  prefixIcon: const Icon(LucideIcons.search, size: 20),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  suffixIcon: isSearching ? const SizedBox(width: 20, height: 20, child: Padding(padding: EdgeInsets.all(10), child: CircularProgressIndicator(strokeWidth: 2))) : null,
                ),
                onChanged: (val) async {
                  if (val.length < 2) {
                    setModalState(() => searchResults = []);
                    return;
                  }
                  setModalState(() => isSearching = true);
                  try {
                    final response = await TaskManagerData.search(val);
                    setModalState(() {
                      searchResults = response.users;
                      isSearching = false;
                    });
                  } catch (e) {
                    setModalState(() => isSearching = false);
                  }
                },
              ),
              const SizedBox(height: 16),
              const Text("Search Results", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
              const SizedBox(height: 8),
              Expanded(
                child: searchResults.isEmpty 
                  ? Center(child: Text(searchController.text.length < 2 ? "Type to search users" : "No users found", style: const TextStyle(color: Colors.grey)))
                  : ListView.builder(
                      itemCount: searchResults.length,
                      itemBuilder: (context, index) {
                        final user = searchResults[index];
                        final String uId = (user["_id"] ?? user["id"]).toString();
                        final String name = _memberDisplayName(user);
                        final String email = user["email"] ?? "";
                        
                        // Check if already a member
                        bool alreadyMember = membersList.any((m) {
                          final mUser = m["userId"];
                          if (mUser is Map) return (mUser["_id"] ?? mUser["id"]).toString() == uId;
                          return mUser.toString() == uId;
                        });

                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: CircleAvatar(
                            backgroundColor: Colors.blue.shade100,
                            child: Text(name[0].toUpperCase(), style: const TextStyle(color: Colors.blue, fontWeight: FontWeight.bold)),
                          ),
                          title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          subtitle: Text(email, style: const TextStyle(fontSize: 12)),
                          trailing: alreadyMember
                            ? const Text("Member", style: TextStyle(color: Colors.grey, fontSize: 12))
                            : ElevatedButton(
                                onPressed: () async {
                                  try {
                                    await TaskManagerData.projectMembersInvite(
                                      widget.projectId,
                                      uId,
                                      "member",
                                      {"canEdit": true}
                                    );
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Invited $name")));
                                      _initProject(widget.projectId); // Refresh members
                                    }
                                  } catch (e) {
                                    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
                                  }
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.blue,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                child: const Text("Invite", style: TextStyle(fontSize: 12)),
                              ),
                        );
                      },
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGoalsSection(bool isDark) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(LucideIcons.target, size: 16, color: Colors.orange),
                  SizedBox(width: 8),
                  Text("Project Goals", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey)),
                ],
              ),
              if (_isAdmin)
                IconButton(
                  icon: const Icon(LucideIcons.plus, size: 18, color: Colors.orange),
                  onPressed: () => _showGoalDialog(null),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
            ],
          ),
          const SizedBox(height: 12),
          if (goalsList.isEmpty)
            const Text("No goals defined yet.", style: TextStyle(color: Colors.grey, fontSize: 13))
          else
            ...goalsList.map((goal) {
              final String title = goal["title"] ?? "Untitled Goal";
              final String id = goal["_id"]?.toString() ?? "";
              final bool isCompleted = goal["status"] == "completed";
              
              return InkWell(
                onTap: _isAdmin ? () => _showGoalDialog(goal) : null,
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6.0),
                  child: Row(
                    children: [
                      Icon(
                        isCompleted ? LucideIcons.circleCheck : LucideIcons.circle,
                        size: 16,
                        color: isCompleted ? Colors.green : Colors.grey,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          title,
                          style: TextStyle(
                            fontSize: 13,
                            decoration: isCompleted ? TextDecoration.lineThrough : null,
                            color: isCompleted ? Colors.grey : (isDark ? Colors.white : Colors.black87),
                          ),
                        ),
                      ),
                      if (_isAdmin) const Icon(LucideIcons.chevronRight, size: 14, color: Colors.grey),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }

  void _showGoalDialog(Map<String, dynamic>? goal) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bool isEdit = goal != null;
    final TextEditingController titleController = TextEditingController(text: goal?["title"] ?? "");
    final TextEditingController descController = TextEditingController(text: goal?["description"] ?? "");
    String status = goal?["status"] ?? "pending";

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
            top: 24,
            left: 20,
            right: 20,
          ),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(isEdit ? "Edit Goal" : "New Project Goal", style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  if (isEdit)
                    IconButton(
                      icon: const Icon(LucideIcons.trash2, color: Colors.red, size: 20),
                      onPressed: () => _confirmDeleteGoal(goal!["_id"].toString()),
                    )
                  else
                    IconButton(icon: const Icon(LucideIcons.x), onPressed: () => Navigator.pop(context)),
                ],
              ),
              const SizedBox(height: 20),
              TextField(
                controller: titleController,
                decoration: InputDecoration(
                  labelText: "Goal Title",
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                autofocus: !isEdit,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: descController,
                maxLines: 2,
                decoration: InputDecoration(
                  labelText: "Description (Optional)",
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              if (isEdit) ...[
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: status,
                  decoration: InputDecoration(
                    labelText: "Status",
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  items: ['pending', 'completed'].map((s) => DropdownMenuItem(value: s, child: Text(s.toUpperCase()))).toList(),
                  onChanged: (val) => setModalState(() => status = val!),
                ),
              ],
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () async {
                    if (titleController.text.isEmpty) return;
                    Navigator.pop(context);
                    try {
                      if (isEdit) {
                        await TaskManagerData.projectGoalsUpdate(
                          goal!["_id"].toString(),
                          titleController.text,
                          descController.text,
                          goal["order"] ?? 0,
                        );
                        // Note: If you need to update status, you might need a separate call or update the API.
                        // Assuming projectGoalsUpdate handles the main fields.
                      } else {
                        await TaskManagerData.goals(
                          widget.projectId,
                          titleController.text,
                          descController.text,
                        );
                      }
                      _initProject(widget.projectId); // Refresh project details (including goals)
                    } catch (e) {
                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.orange.shade700,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(isEdit ? "Update Goal" : "Create Goal", style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmDeleteGoal(String goalId) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Delete Goal?"),
        content: const Text("This goal will be permanently removed from the project."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Cancel")),
          TextButton(
            onPressed: () async {
              Navigator.pop(context); // Close dialog
              Navigator.pop(context); // Close sheet
              try {
                await TaskManagerData.projectGoalsDelete(goalId);
                _initProject(widget.projectId);
              } catch (e) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
              }
            },
            child: const Text("Delete", style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  Widget _buildPublicLanding(bool isDark) {
    return Scaffold(
      appBar: AppBar(
        title: Text(projectName, style: const TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      _buildProjectChip(projectPrivacy, Colors.blue),
                      const SizedBox(width: 8),
                      _buildProjectChip(projectRecruiting, Colors.green),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(description, style: TextStyle(color: isDark ? Colors.white60 : Colors.black54, fontSize: 14)),
                ],
              ),
            ),
            _buildSection(
              title: "Performance",
              child: Column(
                children: [
                  Row(
                    children: [
                      Text("$taskDone / $taskTotal Tasks", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const Spacer(),
                      Text("${taskTotal > 0 ? (taskDone / taskTotal * 100).toStringAsFixed(0) : 0}%", 
                        style: TextStyle(color: Colors.blue.shade400, fontWeight: FontWeight.bold, fontSize: 13))
                    ],
                  ),
                  const SizedBox(height: 10),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: taskTotal > 0 ? taskDone / taskTotal : 0,
                      backgroundColor: isDark ? Colors.white.withOpacity(0.05) : Colors.blue.shade50,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.blue.shade400),
                      minHeight: 6,
                    ),
                  ),
                ],
              ),
            ),
            _buildPublicAction(isDark),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressCard(bool isDark, double progress, int remaining) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark 
            ? [const Color(0xFF1E3C72), const Color(0xFF2A5298)] 
            : [Colors.blue.shade700, Colors.blue.shade500],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.blue.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                "Overall Progress",
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
              Text(
                "${(progress * 100).toInt()}%",
                style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: Colors.white.withOpacity(0.2),
              valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
              minHeight: 8,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildProgressMiniStat(LucideIcons.circleCheck, "$taskDone", "Done"),
              const SizedBox(width: 20),
              _buildProgressMiniStat(LucideIcons.clock, "$remaining", "Remaining"),
              const SizedBox(width: 20),
              _buildProgressMiniStat(LucideIcons.listTodo, "$taskTotal", "Total"),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildProgressMiniStat(IconData icon, String value, String label) {
    return Row(
      children: [
        Icon(icon, size: 14, color: Colors.white70),
        const SizedBox(width: 6),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
            Text(label, style: const TextStyle(color: Colors.white70, fontSize: 10)),
          ],
        ),
      ],
    );
  }

  Widget _buildQuickStats(bool isDark) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade200),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildStatItem("Tasks", taskTotal.toString(), LucideIcons.layers, Colors.blue),
          _buildStatItem("Done", taskDone.toString(), LucideIcons.circleCheck, Colors.green),
          _buildStatItem("Goals", goalsList.length.toString(), LucideIcons.target, Colors.orange),
        ],
      ),
    );
  }

  Widget _buildProjectOverviewCard(bool isDark) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text("Project Overview", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const Spacer(),
              if (_canEdit)
                TextButton.icon(
                  onPressed: _showProjectSettingsSheet,
                  style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(0, 0)),
                  icon: const Icon(LucideIcons.settings, size: 14),
                  label: const Text("Edit"),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            description.isNotEmpty ? description : "No project description yet.",
            style: TextStyle(color: isDark ? Colors.white60 : Colors.black54, height: 1.5),
          ),
          if (projectTags.isNotEmpty) ...[
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: projectTags
                  .map((tag) => _buildOverviewPill(tag, isDark ? Colors.white10 : Colors.grey.shade100, null))
                  .toList(),
            ),
          ],
          const SizedBox(height: 18),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _buildOverviewStat("Due Date", projectDueDate == 'No Date' ? "Not set" : projectDueDate, LucideIcons.calendar, isDark),
              _buildOverviewStat("Visibility", projectVisibility.isEmpty ? "Unknown" : _toDisplayLabel(projectVisibility), LucideIcons.globe, isDark),
              _buildOverviewStat("Recruiting", _toRecruitingLabel(projectRecruiting), LucideIcons.briefcase, isDark),
              _buildOverviewStat("Project Status", _toDisplayLabel(projectStatus), LucideIcons.flag, isDark),
            ],
          ),
          if (lookingForRoles.isNotEmpty) ...[
            const SizedBox(height: 18),
            const Text("Looking For", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: lookingForRoles
                  .map((role) => _buildOverviewPill(role, Colors.blue.withOpacity(0.12), Colors.blue))
                  .toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildOverviewStat(String label, String value, IconData icon, bool isDark) {
    return Container(
      width: 155,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withOpacity(0.03) : Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: Colors.blue.shade400),
          const SizedBox(height: 10),
          Text(label, style: TextStyle(fontSize: 12, color: isDark ? Colors.white54 : Colors.grey.shade600)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildOverviewPill(String label, Color backgroundColor, Color? foregroundColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: foregroundColor,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  String _toDisplayLabel(String value) {
    if (value.isEmpty) return "Unknown";
    return value
        .split('_')
        .map((part) => part.isEmpty ? part : "${part[0].toUpperCase()}${part.substring(1)}")
        .join(' ');
  }

  String _toRecruitingLabel(String value) {
    switch (value) {
      case 'open':
        return "Open to new members";
      case 'closed':
        return "Closed to new members";
      default:
        return _toDisplayLabel(value);
    }
  }

  void _showProjectSettingsSheet() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final nameController = TextEditingController(text: projectName);
    final descriptionController = TextEditingController(text: description);
    final dueDateController = TextEditingController(
      text: projectDueDate == 'No Date' ? '' : projectDueDate,
    );
    final tagsController = TextEditingController(text: projectTags.join(', '));
    final rolesController = TextEditingController(text: lookingForRoles.join(', '));

    String visibility = projectVisibility.isEmpty ? 'public' : projectVisibility;
    String recruitingStatus = projectRecruiting.isEmpty ? 'open' : projectRecruiting;
    String status = projectStatus.isEmpty ? 'active' : projectStatus;
    bool inviteOnly = joinSettings["inviteOnly"] == true;
    bool requireApprovalToJoin = joinSettings["requireApprovalToJoin"] == true;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 24,
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("Edit Project", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    IconButton(
                      icon: const Icon(LucideIcons.x),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: nameController,
                  decoration: InputDecoration(
                    labelText: "Project Name",
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: descriptionController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: "Description",
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: dueDateController,
                  decoration: InputDecoration(
                    labelText: "Due Date",
                    hintText: "YYYY-MM-DD",
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 14),
                DropdownButtonFormField<String>(
                  value: visibility,
                  decoration: InputDecoration(
                    labelText: "Visibility",
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'public', child: Text('Public')),
                    DropdownMenuItem(value: 'private', child: Text('Private')),
                  ],
                  onChanged: (value) => setModalState(() => visibility = value ?? visibility),
                ),
                const SizedBox(height: 14),
                DropdownButtonFormField<String>(
                  value: recruitingStatus,
                  decoration: InputDecoration(
                    labelText: "Recruiting",
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'open', child: Text('Open')),
                    DropdownMenuItem(value: 'closed', child: Text('Closed')),
                  ],
                  onChanged: (value) => setModalState(() => recruitingStatus = value ?? recruitingStatus),
                ),
                const SizedBox(height: 14),
                DropdownButtonFormField<String>(
                  value: status,
                  decoration: InputDecoration(
                    labelText: "Project Status",
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'planning', child: Text('Planning')),
                    DropdownMenuItem(value: 'active', child: Text('Active')),
                    DropdownMenuItem(value: 'on_hold', child: Text('On Hold')),
                    DropdownMenuItem(value: 'completed', child: Text('Completed')),
                  ],
                  onChanged: (value) => setModalState(() => status = value ?? status),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: tagsController,
                  decoration: InputDecoration(
                    labelText: "Tags",
                    hintText: "Comma separated",
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: rolesController,
                  decoration: InputDecoration(
                    labelText: "Looking For Roles",
                    hintText: "Comma separated",
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 14),
                SwitchListTile.adaptive(
                  value: inviteOnly,
                  contentPadding: EdgeInsets.zero,
                  title: const Text("Invite Only"),
                  subtitle: const Text("Only invited users can join directly."),
                  onChanged: (value) => setModalState(() => inviteOnly = value),
                ),
                SwitchListTile.adaptive(
                  value: requireApprovalToJoin,
                  contentPadding: EdgeInsets.zero,
                  title: const Text("Require Approval"),
                  subtitle: const Text("Join requests must be approved."),
                  onChanged: inviteOnly ? null : (value) => setModalState(() => requireApprovalToJoin = value),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: () async {
                      final parsedTags = tagsController.text
                          .split(',')
                          .map((value) => value.trim())
                          .where((value) => value.isNotEmpty)
                          .toList();
                      final parsedRoles = rolesController.text
                          .split(',')
                          .map((value) => value.trim())
                          .where((value) => value.isNotEmpty)
                          .toList();

                      final settings = inviteOnly
                          ? {
                              "inviteOnly": true,
                              "allowSelfJoinRequests": false,
                              "requireApprovalToJoin": false,
                            }
                          : {
                              "inviteOnly": false,
                              "allowSelfJoinRequests": true,
                              "requireApprovalToJoin": requireApprovalToJoin,
                            };

                      try {
                        await TaskManagerData.projectUpdate(
                          widget.projectId,
                          nameController.text.trim(),
                          descriptionController.text.trim(),
                          visibility,
                          dueDateController.text.trim(),
                          recruitingStatus,
                          status,
                          parsedTags,
                          parsedRoles,
                          settings,
                        );

                        if (!mounted) return;
                        Navigator.pop(context);
                        await _initProject(widget.projectId);
                        if (_isMember) {
                          await _initTasks(widget.projectId);
                        }
                      } catch (e) {
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text("Failed to update project: $e")),
                          );
                        }
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue.shade700,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text("Save Changes", style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Icon(icon, size: 20, color: color),
        const SizedBox(height: 8),
        Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
      ],
    );
  }

  Future<void> _requestJoin() async {
    setState(() => _isRequesting = true);
    try {
      await TaskManagerData.projectJoin(widget.projectId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Request sent successfully!")),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Error: ${e.toString().replaceAll("Exception: ", "")}")),
        );
      }
    } finally {
      if (mounted) setState(() => _isRequesting = false);
    }
  }

  Widget _buildPublicAction(bool isDark) {
    // Determine if we can join based on visibility
    // Taskademia Logic: Request to Join is for Public projects. Private is Invite Only.
    final bool isPublic = projectPrivacy == 'public';
    final bool canRequest = isPublic && projectRecruiting == 'open';
    
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.blue.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.blue.withOpacity(0.1) : Colors.blue.shade100),
      ),
      child: Column(
        children: [
          Icon(
            !isPublic ? LucideIcons.lock : (canRequest ? LucideIcons.lockOpen : LucideIcons.ban), 
            size: 48, 
            color: !isPublic ? Colors.orange.shade400 : (canRequest ? Colors.green.shade400 : Colors.red.shade400)
          ),
          const SizedBox(height: 16),
          Text(
            !isPublic ? "Private Workspace" : (canRequest ? "Join this Project" : "Not Recruiting"),
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            !isPublic 
              ? "This is a private workspace. Access is by invitation only."
              : (canRequest 
                  ? "This project is looking for new members! Send a request to join the team."
                  : "This project is currently closed to new members."),
            textAlign: TextAlign.center,
            style: TextStyle(color: isDark ? Colors.white60 : Colors.black54, height: 1.5),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: (canRequest && !_isRequesting) ? _requestJoin : null,
              icon: _isRequesting 
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Icon(!isPublic ? LucideIcons.shieldAlert : (canRequest ? LucideIcons.userPlus : LucideIcons.ban)),
              label: Text(_isRequesting ? "Sending..." : (!isPublic ? "Invite Only" : (canRequest ? "Request to Join" : "Applications Closed"))),
              style: ElevatedButton.styleFrom(
                backgroundColor: canRequest ? Colors.blue.shade700 : Colors.grey.shade800,
                foregroundColor: Colors.white,
                disabledBackgroundColor: isDark ? Colors.white10 : Colors.grey.shade300,
                disabledForegroundColor: isDark ? Colors.white24 : Colors.grey.shade500,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSection({required String title, required Widget child, Widget? trailing}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey)),
              if (trailing != null) trailing,
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  Widget _buildKanbanColumn(String title, List<ProjectTask> tasks, Color bgColor, Color accentColor, String statusKey) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return DragTarget<ProjectTask>(
      onWillAccept: (data) => data?.status != statusKey,
      onAccept: (task) => _moveTask(task, statusKey),
      builder: (context, candidateData, rejectedData) {
        final bool isOver = candidateData.isNotEmpty;
        
        return Container(
          width: 280,
          margin: const EdgeInsets.only(right: 12),
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: isOver ? accentColor.withOpacity(0.1) : bgColor,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isOver ? accentColor : (isDark ? Colors.white.withOpacity(0.03) : Colors.transparent),
              width: 2,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(color: accentColor, shape: BoxShape.circle),
                    ),
                    const SizedBox(width: 8),
                    Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text("${tasks.length}", style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
              ...tasks.map((task) => _buildDraggableTask(task, isDark)),
              
              // Quick Add Button
              if (_canEdit) ...[
                const SizedBox(height: 8),
                InkWell(
                  onTap: () => _showAddTaskDialog(statusKey),
                  borderRadius: BorderRadius.circular(8),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                    child: Row(
                      children: [
                        Icon(LucideIcons.plus, size: 16, color: accentColor),
                        const SizedBox(width: 8),
                        Text("Add Task", style: TextStyle(color: accentColor, fontSize: 13, fontWeight: FontWeight.w500)),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildDraggableTask(ProjectTask task, bool isDark) {
    if (!_canEdit) return _buildTaskCard(task, isDark);

    return Draggable<ProjectTask>(
      data: task,
      feedback: Material(
        color: Colors.transparent,
        child: Container(
          width: 264, // Matches column width minus padding
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF333333) : Colors.white,
            borderRadius: BorderRadius.circular(8),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 10, offset: const Offset(0, 4))],
          ),
          child: _buildTaskCardContent(task, isDark),
        ),
      ),
      childWhenDragging: Opacity(
        opacity: 0.3,
        child: _buildTaskCard(task, isDark),
      ),
      child: _buildTaskCard(task, isDark),
    );
  }

  Widget _buildTaskCard(ProjectTask task, bool isDark) {
    return InkWell(
      onTap: () async {
        final result = await Navigator.pushNamed(
          context,
          Routes.taskDetailScreen,
          arguments: {
            'taskId': task.id,
            'projectId': widget.projectId,
            'initialData': task.rawJson,
            'projectMembers': membersList,
          },
        );
        if (result != null) {
          _loadData(); // Refresh everything (tasks + stats)
        }
      },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF262626) : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade200),
          boxShadow: isDark ? [] : [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 2))],
        ),
        child: _buildTaskCardContent(task, isDark),
      ),
    );
  }

  Widget _buildTaskCardContent(ProjectTask task, bool isDark) {
    return IntrinsicHeight(
      child: Row(
        children: [
          Container(
            width: 4,
            decoration: BoxDecoration(
              color: _getPriorityColor(task.priority),
              borderRadius: const BorderRadius.only(topLeft: Radius.circular(8), bottomLeft: Radius.circular(8)),
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(task.title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  if (task.description.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(task.description, 
                      maxLines: 1, 
                      overflow: TextOverflow.ellipsis, 
                      style: const TextStyle(fontSize: 11, color: Colors.grey)
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _moveTask(ProjectTask task, String newStatus) async {
    final normalizedNewStatus = _normalizeTaskStatus(newStatus);

    // 1. Optimistic Update
    setState(() {
      // Remove from old list
      if (task.status == 'todo') todo.removeWhere((t) => t.id == task.id);
      if (task.status == 'in_progress') inProgress.removeWhere((t) => t.id == task.id);
      if (task.status == 'blocked') review.removeWhere((t) => t.id == task.id);
      if (task.status == 'done') done.removeWhere((t) => t.id == task.id);

      // Create updated task
      final updatedTask = ProjectTask(
        id: task.id,
        title: task.title,
        status: normalizedNewStatus,
        description: task.description,
        priority: task.priority,
        goal: task.goal,
        rawJson: {...task.rawJson, "status": normalizedNewStatus},
      );

      // Add to new list
      if (normalizedNewStatus == 'todo') todo.add(updatedTask);
      if (normalizedNewStatus == 'in_progress') inProgress.add(updatedTask);
      if (normalizedNewStatus == 'blocked') review.add(updatedTask);
      if (normalizedNewStatus == 'done') done.add(updatedTask);

      taskTotal = todo.length + inProgress.length + review.length + done.length;
      taskToDo = todo.length;
      taskInProgress = inProgress.length;
      taskBlocked = review.length;
      taskDone = done.length;
    });

    try {
      // 2. API Call
      await TaskManagerData.tasksByIdUpdate(task.id, {"status": normalizedNewStatus});
    } catch (e) {
      // 3. Rollback if failed (Optional, but good practice)
      _initTasks(widget.projectId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Failed to move task: $e")));
      }
    }
  }

  void _showAddTaskDialog(String status) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final TextEditingController titleController = TextEditingController();
    final TextEditingController descController = TextEditingController();
    String selectedPriority = 'low';
    String? selectedGoalId;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
            top: 24,
            left: 20,
            right: 20,
          ),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text("New Task - ${status.toUpperCase()}", style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(icon: const Icon(LucideIcons.x), onPressed: () => Navigator.pop(context)),
                ],
              ),
              const SizedBox(height: 20),
              TextField(
                controller: titleController,
                decoration: InputDecoration(
                  labelText: "Task Title",
                  hintText: "What needs to be done?",
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  prefixIcon: const Icon(LucideIcons.type, size: 20),
                ),
                autofocus: true,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: descController,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: "Description (Optional)",
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  prefixIcon: const Icon(LucideIcons.text, size: 20),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: selectedPriority,
                      decoration: InputDecoration(
                        labelText: "Priority",
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      items: ['low', 'medium', 'high'].map((p) => DropdownMenuItem(value: p, child: Text(p.toUpperCase()))).toList(),
                      onChanged: (val) => setModalState(() => selectedPriority = val!),
                    ),
                  ),
                  const SizedBox(width: 12),
                  if (goalsList.isNotEmpty)
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: selectedGoalId,
                        decoration: InputDecoration(
                          labelText: "Goal",
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        hint: const Text("Select Goal"),
                        items: goalsList.map((g) => DropdownMenuItem(value: g["_id"]?.toString(), child: Text(g["title"] ?? "Untitled", overflow: TextOverflow.ellipsis))).toList(),
                        onChanged: (val) => setModalState(() => selectedGoalId = val),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () async {
                    if (titleController.text.isEmpty) return;
                    
                    Navigator.pop(context); // Close dialog
                    
                    try {
                      await TaskManagerData.tasks(
                        widget.projectId,
                        titleController.text,
                        descController.text,
                        "", // dueDate
                        [], // assignedTo
                        status,
                        selectedPriority,
                        [], // tags
                        "", // rolesRequired
                        selectedGoalId ?? "",
                      );
                      
                      // Refresh task lists
                      _initTasks(widget.projectId);
                    } catch (e) {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
                      }
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue.shade700,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text("Create Task", style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProjectChip(String label, Color color) {
    if (label.isEmpty) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(label.toUpperCase(), style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
    );
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'high': return Colors.red.shade400;
      case 'medium': return Colors.orange.shade400;
      default: return Colors.green.shade400;
    }
  }
}

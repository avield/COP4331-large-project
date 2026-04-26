import 'dart:convert';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../utils/url_utils.dart';
import '../utils/get_api.dart';

import '../utils/debouncer.dart';
import 'package:taskademia/routes/routes.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  Widget build(BuildContext context) {
    return const DashboardMainPage();
  }
}

class DashboardMainPage extends StatefulWidget {
  const DashboardMainPage({super.key});

  @override
  State<DashboardMainPage> createState() => _DashboardMainPageState();
}

class _DashboardMainPageState extends State<DashboardMainPage> {
  String errorMessage = '';
  bool _isSearching = false;
  final SearchController _searchController = SearchController();
  final _debouncer = Debouncer(milliseconds: 500);
  final ValueNotifier<GlobalSearchResponse?> _searchNotifier = ValueNotifier<GlobalSearchResponse?>(null);
  String _selectedCategory = 'All';
  String _selectedStatus = 'All';

  List<Map<String, dynamic>> notifications = [];
  List<Map<String, dynamic>> projects = [];
  
  int totalTasks = 0;
  int totalDoneTasks = 0;
  double totalProgress = 0;
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _refreshData();
  }

  Future<void> _refreshData() async {
    setState(() => isLoading = true);
    await Future.wait([
      _initNotifications(),
      _initProjects(),
    ]);
    if (mounted) setState(() => isLoading = false);
  }

  @override
  void dispose() {
    _debouncer.dispose();
    _searchController.dispose();
    _searchNotifier.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: _buildAppBar(),
      body: isLoading 
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _refreshData,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (projects.isNotEmpty) ...[
                    _buildStatsOverview(),
                    const SizedBox(height: 24),
                  ],
                  if (notifications.isNotEmpty) ...[
                    _buildSectionHeader("Invitations", notifications.length.toString()),
                    const SizedBox(height: 12),
                    ...notifications.asMap().entries.map((entry) => _buildNotificationCard(entry.value, entry.key)),
                    const SizedBox(height: 24),
                  ],
                  _buildSectionHeader("Your Projects", projects.length.toString()),
                  const SizedBox(height: 12),
                  if (projects.isEmpty && notifications.isEmpty)
                    _buildNewUserWelcome()
                  else if (projects.isEmpty)
                    _buildEmptyState()
                  else
                    ...projects.map((p) => _buildProjectCard(p)),
                  const SizedBox(height: 80), 
                ],
              ),
            ),
          ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.pushNamed(context, Routes.projectCreateScreen),
        icon: const Icon(LucideIcons.plus),
        label: const Text("New Project"),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
      ),
      bottomNavigationBar: _buildErrorBanner(),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    return AppBar(
      backgroundColor: isDark ? const Color(0xFF121212) : Colors.white,
      elevation: 0,
      scrolledUnderElevation: 0,
      automaticallyImplyLeading: false,
      title: Row(
        children: [
          Icon(LucideIcons.graduationCap, color: Colors.blue.shade700, size: 24),
          const SizedBox(width: 8),
          const Expanded(
            child: Text(
              "Taskademia",
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 20,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
      actions: [
        SearchAnchor(
          searchController: _searchController,
          viewHintText: "Search anything...",
          viewBackgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
          viewSurfaceTintColor: Colors.transparent,
          isFullScreen: true,
          builder: (context, controller) => Container(
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF262626) : Colors.grey.shade100,
              borderRadius: BorderRadius.circular(10),
            ),
            child: IconButton(
              icon: Icon(LucideIcons.search, size: 20, color: isDark ? Colors.white70 : Colors.black54),
              onPressed: () => controller.openView(),
            ),
          ),
          suggestionsBuilder: (context, controller) {
            if (controller.text.isEmpty) {
              _searchNotifier.value = null;
              return [const Padding(padding: EdgeInsets.all(16), child: Text("Type to search..."))];
            }

            _debouncer.run(() async {
              try {
                final results = await TaskManagerData.search(controller.text);
                _searchNotifier.value = results;
              } catch (e) {
                _searchNotifier.value = GlobalSearchResponse(users: [], projects: [], tasks: []);
              }
            });

            return [
              StatefulBuilder(
                builder: (context, setInnerState) => Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: Row(
                        children: ["All", "Projects", "Tasks", "People"].map((cat) => Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: FilterChip(
                            label: Text(cat, style: TextStyle(fontSize: 12, color: _selectedCategory == cat ? Colors.white : (isDark ? Colors.white70 : Colors.black87))),
                            selected: _selectedCategory == cat,
                            onSelected: (selected) {
                              setInnerState(() {
                                _selectedCategory = cat;
                                if (cat != 'Tasks') _selectedStatus = 'All';
                              });
                            },
                            selectedColor: Colors.blue.shade700,
                            checkmarkColor: Colors.white,
                            backgroundColor: isDark ? const Color(0xFF262626) : Colors.grey.shade100,
                          ),
                        )).toList(),
                      ),
                    ),
                    if (_selectedCategory == 'Tasks')
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                        child: Row(
                          children: ["All", "todo", "in-progress", "review", "done"].map((status) => Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: FilterChip(
                              label: Text(status.toUpperCase(), style: TextStyle(fontSize: 10, color: _selectedStatus == status ? Colors.white : (isDark ? Colors.white60 : Colors.black54))),
                              selected: _selectedStatus == status,
                              onSelected: (selected) {
                                setInnerState(() => _selectedStatus = status);
                              },
                              selectedColor: Colors.green.shade700,
                              checkmarkColor: Colors.white,
                              backgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.grey.shade50,
                              padding: EdgeInsets.zero,
                              visualDensity: VisualDensity.compact,
                            ),
                          )).toList(),
                        ),
                      ),
                    const Divider(height: 1),
                  ],
                ),
              ),
              ValueListenableBuilder<GlobalSearchResponse?>(
                valueListenable: _searchNotifier,
                builder: (context, data, _) {
                  if (data == null) {
                    return const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()));
                  }
                  
                  final List<Widget> results = [];
                  final bool showAll = _selectedCategory == 'All';

                  if (data.users.isEmpty && data.projects.isEmpty && data.tasks.isEmpty) {
                    results.add(const Padding(padding: EdgeInsets.all(20), child: Text("No results found.")));
                  } else {
                    if (data.users.isNotEmpty && (showAll || _selectedCategory == 'People')) {
                      results.add(_buildSearchHeader("USERS"));
                      results.addAll(data.users.map((u) {
                        final userId = u["_id"] ?? u["id"];
                        final imageUrl = u["profilePictureUrl"];
                        return ListTile(
                          leading: CircleAvatar(
                            backgroundColor: Colors.blue.shade50,
                            backgroundImage: imageUrl != null && imageUrl.isNotEmpty
                                ? NetworkImage(UrlUtils.getFullUrl(imageUrl))
                                : null,
                            child: (imageUrl == null || imageUrl.isEmpty)
                                ? Text(u['displayName']?[0] ?? '?', style: TextStyle(color: Colors.blue.shade700))
                                : null,
                          ),
                          title: Text(u['displayName'] ?? 'Unknown', overflow: TextOverflow.ellipsis),
                          subtitle: Text(u['email'] ?? '', style: const TextStyle(fontSize: 12)),
                          onTap: () {
                            controller.closeView(u['displayName']);
                            Navigator.pushNamed(context, Routes.profileScreen, arguments: userId);
                          },
                        );
                      }));
                    }
                    if (data.projects.isNotEmpty && (showAll || _selectedCategory == 'Projects')) {
                      results.add(_buildSearchHeader("PROJECTS"));
                      results.addAll(data.projects.map((p) {
                        final projectId = (p["_id"] ?? p["id"])?.toString() ?? "";
                        return ListTile(
                          leading: Icon(LucideIcons.folder, color: Colors.orange.shade700),
                          title: Text(p['name'] ?? 'Untitled', overflow: TextOverflow.ellipsis),
                          subtitle: Text(p['description'] ?? '', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12)),
                          onTap: () {
                            controller.closeView(p['name']);
                            if (projectId.isNotEmpty) {
                              Navigator.pushNamed(context, Routes.projectsScreen, arguments: projectId);
                            }
                          },
                        );
                      }));
                    }
                    if (data.tasks.isNotEmpty && (showAll || _selectedCategory == 'Tasks')) {
                      final filteredTasks = _selectedStatus == 'All' 
                        ? data.tasks 
                        : data.tasks.where((t) => (t["status"]?.toString().toLowerCase() ?? "") == _selectedStatus.toLowerCase()).toList();

                      if (filteredTasks.isNotEmpty) {
                        results.add(_buildSearchHeader("TASKS"));
                        results.addAll(filteredTasks.map((t) {
                          final projectId = (t["projectId"] is Map) 
                            ? (t["projectId"]["_id"] ?? t["projectId"]["id"])?.toString() ?? ""
                            : t["projectId"]?.toString() ?? "";
                          final status = t["status"]?.toString() ?? "todo";
                            
                          return ListTile(
                            leading: Icon(
                              status == 'done' ? LucideIcons.circleCheck : LucideIcons.circle, 
                              color: status == 'done' ? Colors.green : Colors.grey,
                              size: 20,
                            ),
                            title: Text(t['title'] ?? 'Untitled', overflow: TextOverflow.ellipsis),
                            subtitle: Text("In ${t["projectId"]?["name"] ?? 'Project'}", style: const TextStyle(fontSize: 12)),
                            trailing: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: _getStatusColor(status).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(status.toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: _getStatusColor(status))),
                            ),
                            onTap: () {
                              controller.closeView(t['title']);
                              if (projectId.isNotEmpty) {
                                Navigator.pushNamed(
                                  context, 
                                  Routes.taskDetailScreen, 
                                  arguments: {
                                    'taskId': (t["_id"] ?? t["id"])?.toString() ?? "",
                                    'projectId': projectId,
                                    'initialData': t,
                                  },
                                );
                              }
                            },
                          );
                        }));
                      }
                    }

                    if (results.isEmpty) {
                      results.add(const Padding(padding: EdgeInsets.all(20), child: Text("No matching results in this category.")));
                    }
                  }

                  return Column(
                    mainAxisSize: MainAxisSize.min,
                    children: results,
                  );
                },
              )
            ];
          },
        ),
        Container(
          margin: const EdgeInsets.only(right: 16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF262626) : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(10),
          ),
          child: IconButton(
            icon: Icon(LucideIcons.user, size: 20, color: isDark ? Colors.white70 : Colors.black54),
            onPressed: () => Navigator.pushNamed(context, Routes.profileScreen),
          ),
        ),
      ],
    );
  }

  Widget _buildSearchHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          color: Colors.blue.shade300,
          fontSize: 13,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.5,
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'done': return Colors.green;
      case 'in-progress': return Colors.blue;
      case 'review': return Colors.orange;
      case 'blocked': return Colors.red;
      default: return Colors.grey;
    }
  }


  Widget _buildStatsOverview() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.blue.shade700,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.blue.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 6))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Completion Rate across all projects", style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w500)),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("${totalProgress.toStringAsFixed(0)}%", style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
              Text("$totalDoneTasks / $totalTasks tasks", style: const TextStyle(color: Colors.white, fontSize: 14)),
            ],
          ),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: LinearProgressIndicator(
              value: totalTasks > 0 ? totalDoneTasks / totalTasks : 0,
              backgroundColor: Colors.white.withOpacity(0.2),
              valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
              minHeight: 8,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, String count) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Row(
      children: [
        Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: isDark ? Colors.blue.withOpacity(0.1) : Colors.blue.shade50,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            count,
            style: TextStyle(
              color: isDark ? Colors.blue.shade300 : Colors.blue.shade700,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildNotificationCard(Map<String, dynamic> notification, int index) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white10 : Colors.blue.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(LucideIcons.bell, size: 18, color: Colors.blue),
              const SizedBox(width: 8),
              Expanded(
                child: Text.rich(
                  TextSpan(
                    text: notification["owner"] ?? "Someone",
                    style: const TextStyle(fontWeight: FontWeight.bold),
                    children: [
                      const TextSpan(text: " invited you to ", style: TextStyle(fontWeight: FontWeight.normal)),
                      TextSpan(text: notification["projectName"] ?? "a project", style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: () => _acceptNotification(notification["id"], index),
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
                  onPressed: () => _rejectNotification(notification["id"], index),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    side: BorderSide(color: isDark ? Colors.white24 : Colors.grey.shade300),
                  ),
                  child: Text("Decline", style: TextStyle(color: isDark ? Colors.white70 : Colors.black)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildProjectCard(Map<String, dynamic> project) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    double progress = (project["total"] > 0) ? project["done"] / project["total"] : 0;
    
    return InkWell(
      onTap: () => Navigator.pushNamed(context, Routes.projectsScreen, arguments: project["id"]),
      child: Hero(
        tag: 'project-name-${project["id"]}',
        child: Material(
          color: Colors.transparent,
          child: Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.cardColor,
              borderRadius: BorderRadius.circular(16),
              boxShadow: isDark ? [] : [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 2))],
              border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade100),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        project["name"],
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ),
                    _buildStatusChip(project["status"]),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  project["description"],
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: isDark ? Colors.white60 : Colors.grey.shade600, fontSize: 13),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    const Icon(LucideIcons.calendar, size: 14, color: Colors.grey),
                    const SizedBox(width: 4),
                    Text(
                      "Due ${project["dueDate"]}",
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                    const Spacer(),
                    Text("${(progress * 100).toStringAsFixed(0)}%", style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress,
                    backgroundColor: isDark ? Colors.white10 : Colors.grey.shade100,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.blue.shade700),
                    minHeight: 4,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isActive = status.toLowerCase() == 'active';
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: isActive 
          ? (isDark ? Colors.green.withOpacity(0.2) : Colors.green.shade50)
          : (isDark ? Colors.orange.withOpacity(0.2) : Colors.orange.shade50),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          color: isActive 
            ? (isDark ? Colors.green.shade300 : Colors.green.shade700)
            : (isDark ? Colors.orange.shade300 : Colors.orange.shade700),
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
      width: double.infinity,
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade100),
      ),
      child: Column(
        children: [
          Icon(LucideIcons.folderPlus, size: 48, color: isDark ? Colors.white24 : Colors.grey.shade300),
          const SizedBox(height: 16),
          const Text("No active projects", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(
            "You haven't joined any projects yet. Check your invitations or create a new one.",
            textAlign: TextAlign.center,
            style: TextStyle(color: isDark ? Colors.white38 : Colors.grey.shade500),
          ),
        ],
      ),
    );
  }

  Widget _buildNewUserWelcome() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(24),
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.blue.shade700,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            children: [
              const Icon(LucideIcons.rocket, size: 48, color: Colors.white),
              const SizedBox(height: 16),
              const Text(
                "Welcome to Taskademia!",
                style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                "Your academic workspace is ready. Let's get you started with your first project.",
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white70, fontSize: 14),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => Navigator.pushNamed(context, Routes.projectCreateScreen),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.blue.shade700,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text("Create Workspace", style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _buildGuideStep(LucideIcons.search, "Find a Team", "Use the search bar to find friends or existing projects.", isDark),
        _buildGuideStep(LucideIcons.user, "Setup Profile", "Make sure your school and roles are up to date.", isDark),
      ],
    );
  }

  Widget _buildGuideStep(IconData icon, String title, String desc, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade100),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: Colors.blue.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, size: 20, color: Colors.blue),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(desc, style: TextStyle(color: isDark ? Colors.white38 : Colors.grey, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget? _buildErrorBanner() {
    if (errorMessage.isEmpty) return null;
    return Container(
      color: Colors.red,
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          Icon(LucideIcons.circleAlert, color: Colors.white, size: 20),
          const SizedBox(width: 12),
          Expanded(child: Text(errorMessage, style: const TextStyle(color: Colors.white))),
          IconButton(icon: const Icon(LucideIcons.x, color: Colors.white, size: 20), onPressed: () => setState(() => errorMessage = '')),
        ],
      ),
    );
  }

  Future<void> _initNotifications() async {
    try {
      String response = await TaskManagerData.projectInvitations();
      final decoded = json.decode(response);
      final List<dynamic> jsonList = decoded is List
          ? decoded
          : List<dynamic>.from(decoded["invitations"] ?? []);
      if (!mounted) return;
      setState(() {
        notifications = jsonList
            .where((n) =>
                n is Map<String, dynamic> &&
                n["_id"] != null &&
                n["projectId"] != null)
            .map((n) => {
                  "id": n["_id"].toString(),
                  "owner": n["joinedBy"]?["profile"]?["displayName"] ??
                      n["joinedBy"]?["email"] ??
                      "Someone",
                  "projectName": n["projectId"]?["name"] ?? "a project",
                })
            .toList();
      });
    } catch (e) {
      if (mounted) setState(() => errorMessage = e.toString().replaceAll("Exception: ", ""));
    }
  }

  Future<void> _acceptNotification(String id, int index) async {
    try {
      await TaskManagerData.notificationAccept(id);
      if (mounted) setState(() => notifications.removeAt(index));
    } catch (e) {
      if (mounted) setState(() => errorMessage = e.toString().replaceAll("Exception: ", ""));
    }
  }

  Future<void> _rejectNotification(String id, int index) async {
    try {
      await TaskManagerData.notificationReject(id);
      if (mounted) setState(() => notifications.removeAt(index));
    } catch (e) {
      if (mounted) setState(() => errorMessage = e.toString().replaceAll("Exception: ", ""));
    }
  }

  Future<void> _initProjects() async {
    try {
      String response = await TaskManagerData.projects();
      List<dynamic> jsonList = json.decode(response);
      if (!mounted) return;
      setState(() {
        projects = jsonList.map((p) => {
          "id": p["_id"].toString(),
          "name": p["name"].toString(),
          "description": p["description"]?.toString() ?? "",
          "status": p["status"]?.toString() ?? "Active",
          "dueDate": p["dueDate"]?.toString().split("T")[0] ?? "No Date",
          "total": p["taskCounts"]?["total"] as int? ?? 0,
          "done": p["taskCounts"]?["done"] as int? ?? 0,
        }).toList();

        totalTasks = projects.fold(0, (sum, p) => sum + (p["total"] as int));
        totalDoneTasks = projects.fold(0, (sum, p) => sum + (p["done"] as int));
        totalProgress = totalTasks > 0 ? (totalDoneTasks / totalTasks * 100) : 0;
      });
    } catch (e) {
      if (mounted) setState(() => errorMessage = e.toString().replaceAll("Exception: ", ""));
    }
  }
}

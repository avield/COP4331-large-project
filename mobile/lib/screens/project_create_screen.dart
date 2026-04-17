import 'dart:convert';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../utils/get_api.dart';
import '../utils/debouncer.dart';
import 'package:taskademia/routes/routes.dart';

class ProjectCreateScreen extends StatefulWidget {
  const ProjectCreateScreen({super.key});

  @override
  State<ProjectCreateScreen> createState() => _ProjectCreateScreenState();
}

class _ProjectCreateScreenState extends State<ProjectCreateScreen> {
  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      body: const ProjectCreateMainPage(),
    );
  }
}

class ProjectCreateMainPage extends StatefulWidget {
  const ProjectCreateMainPage({super.key});

  @override
  State<ProjectCreateMainPage> createState() => _ProjectCreateMainPageState();
}

class ProjectGoal {
  String title;
  String description;

  ProjectGoal({this.title = "", this.description = ""});

  Map<String, dynamic> toJson() => {
    'title': title,
    'description': description,
  };
}

class MemberPermissions {
  bool canEditProject;
  bool canManageMembers;
  bool canCreateTasks;
  bool canAssignTasks;
  bool canCompleteAnyTask;
  bool canModerateChat;

  MemberPermissions({
    this.canEditProject = false,
    this.canManageMembers = false,
    this.canCreateTasks = true,
    this.canAssignTasks = false,
    this.canCompleteAnyTask = false,
    this.canModerateChat = false,
  });

  Map<String, dynamic> toJson() => {
    "canEditProject": canEditProject,
    "canManageMembers": canManageMembers,
    "canCreateTasks": canCreateTasks,
    "canAssignTasks": canAssignTasks,
    "canCompleteAnyTask": canCompleteAnyTask,
    "canModerateChat": canModerateChat,
  };
}

class InvitedMember {
  String userId;
  String role;
  MemberPermissions permissions;

  InvitedMember({
    required this.userId,
    this.role = "Member",
    required this.permissions,
  });

  Map<String, dynamic> toJson() => {
    "userId": userId,
    "role": role,
    "permissions": permissions.toJson(),
  };
}

class _ProjectCreateMainPageState extends State<ProjectCreateMainPage> {
  String errorMessage = '';
  bool _isSearching = false;
  final SearchController _searchController = SearchController();
  final _debouncer = Debouncer(milliseconds: 500);
  final ValueNotifier<GlobalSearchResponse?> _searchNotifier = ValueNotifier(null);

  final TextEditingController _projectNameController = TextEditingController();
  final TextEditingController _projectDescriptionController = TextEditingController();
  final TextEditingController _projectPrivacyController = TextEditingController();
  final TextEditingController _dateController = TextEditingController();
  String _isoDateForDb = '';
  final List<ProjectGoal> goals = [];
  int _selectedIndex = 2;

  @override
  void initState() {
    super.initState();
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
    const Color darkBg = Color(0xFF121212);
    const Color cardBg = Color(0xFF1E1E1E);
    const Color inputBorderColor = Color(0xFF333333);

    return Scaffold(
      backgroundColor: darkBg,
      appBar: AppBar(
        backgroundColor: const Color(0xFF1A1A1A),
        foregroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: !_isSearching
            ? const Text("Create Project", style: TextStyle(fontWeight: FontWeight.bold))
            : SearchAnchor(
          searchController: _searchController,
          builder: (context, controller) {
            return SearchBar(
              controller: controller,
              hintText: "Search users, projects...",
              onTap: () => controller.openView(),
              onChanged: (val) => controller.openView(),
              leading: const Icon(Icons.search),
              trailing: [
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => setState(() => _isSearching = false),
                ),
              ],
            );
          },
          suggestionsBuilder: (context, controller) {
            _debouncer.run(() async {
              if (controller.text.isEmpty) {
                _searchNotifier.value = null;
                return;
              }
              try {
                final results = await TaskManagerData.search(controller.text);
                _searchNotifier.value = results;
              } catch (e) {
                debugPrint("Search Error: $e");
                _searchNotifier.value = GlobalSearchResponse(users: [], projects: [], tasks: []);
              }
            });

            // Return the result view wrapped in a List
            return [
              ValueListenableBuilder<GlobalSearchResponse?>(
                valueListenable: _searchNotifier,
                builder: (context, data, _) {
                  if (data == null) {
                    return const Center(child: Padding(
                      padding: EdgeInsets.all(20),
                      child: CircularProgressIndicator(),
                    ));
                  }

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (data.users.isNotEmpty) ...[
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                          child: Text("USERS", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey[600])),
                        ),
                        ...data.users.map((u) {
                          final profile = u['profile'] ?? {};
                          final displayName = profile['displayName'] ?? u['displayName'] ?? 'Unknown';
                          final picture = profile['picture'] ?? '';
                          return ListTile(
                            leading: CircleAvatar(
                              backgroundImage: picture.isNotEmpty
                                  ? NetworkImage("https://taskademia.app$picture")
                                  : null,
                              child: picture.isEmpty ? Text(displayName[0]) : null,
                            ),
                            title: Text(displayName),
                            subtitle: Text(u['email'] ?? ''),
                            onTap: () => Navigator.pushNamed(context, Routes.profileScreen, arguments: u["id"]),
                          );
                        }),
                      ],
                      if (data.projects.isNotEmpty) ...[
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                          child: Text("PROJECTS", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey[600])),
                        ),
                        ...data.projects.map((p) => ListTile(
                          leading: const Icon(Icons.folder),
                          title: Text(p['name']),
                          subtitle: Text(p['description'] ?? '', maxLines: 1),
                          onTap: () => Navigator.pushNamed(context, Routes.projectsScreen, arguments: p["_id"]),
                        )),
                      ],
                    ],
                  );
                },
              )
            ];
          },
        ),
        actions: [
          if (!_isSearching)
            IconButton(
              icon: const Icon(Icons.search),
              onPressed: () {
                setState(() {
                  _isSearching = true;
                });
                Future.delayed(Duration.zero, () => _searchController.openView());
              },
            ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            const Padding(
              padding: EdgeInsets.all(16.0),
              child: Text(
                "Set up a new collaborative project with goals and tasks for your team.",
                style: TextStyle(color: Colors.white70),
              ),
            ),
            Container(
              padding: const EdgeInsets.all(20),
              margin: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(15),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 10)]
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Project Details", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                  const Text("Provide basic information about your project.", style: TextStyle(color: Colors.grey, fontSize: 13)),
                  const SizedBox(height: 16),
                  const Text("Project Name (Required)", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white70)),
                  TextField(
                    controller: _projectNameController,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: "e.g., Mobile App Design Project",
                      hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                      enabledBorder: const UnderlineInputBorder(borderSide: BorderSide(color: inputBorderColor)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text("Description (Required)", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white70)),
                  TextField(
                    controller: _projectDescriptionController,
                    style: const TextStyle(color: Colors.white),
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: "Describe the project objectives and scope...",
                      hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                      enabledBorder: const UnderlineInputBorder(borderSide: BorderSide(color: inputBorderColor)),
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text("Product Visibility", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white70)),
                  const SizedBox(height: 8),
                  InkWell(
                    onTap: () {
                      setState(() {
                        _selectedIndex = 1;
                        _projectPrivacyController.text = "public";
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        border: Border.all(color: _selectedIndex == 1 ? Colors.blue : inputBorderColor),
                        borderRadius: BorderRadius.circular(10),
                        color: _selectedIndex == 1 ? Colors.blue.withOpacity(0.05) : Colors.transparent,
                      ),
                      child: Row(
                        children: [
                          Icon(_selectedIndex == 1 ? Icons.radio_button_checked : Icons.radio_button_off, color: _selectedIndex == 1 ? Colors.blue : Colors.grey),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Icon(LucideIcons.globe, size: 16, color: _selectedIndex == 1 ? Colors.blue : Colors.grey),
                                    const SizedBox(width: 8),
                                    Text("Public (Looking for Group)", style: TextStyle(fontWeight: FontWeight.bold, color: _selectedIndex == 1 ? Colors.blue : Colors.white)),
                                  ],
                                ),
                                const Text("Anyone on Taskademia can search for this project and request to join your team.", style: TextStyle(fontSize: 12, color: Colors.grey)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  InkWell(
                    onTap: () {
                      setState(() {
                        _selectedIndex = 2;
                        _projectPrivacyController.text = "private";
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        border: Border.all(color: _selectedIndex == 2 ? Colors.blue : inputBorderColor),
                        borderRadius: BorderRadius.circular(10),
                        color: _selectedIndex == 2 ? Colors.blue.withOpacity(0.05) : Colors.transparent,
                      ),
                      child: Row(
                        children: [
                          Icon(_selectedIndex == 2 ? Icons.radio_button_checked : Icons.radio_button_off, color: _selectedIndex == 2 ? Colors.blue : Colors.grey),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Icon(LucideIcons.lock, size: 16, color: _selectedIndex == 2 ? Colors.blue : Colors.grey),
                                    const SizedBox(width: 8),
                                    Text("Private", style: TextStyle(fontWeight: FontWeight.bold, color: _selectedIndex == 2 ? Colors.blue : Colors.white)),
                                  ],
                                ),
                                const Text("Only you and people you explicitly invite can see and contribute to this project.", style: TextStyle(fontSize: 12, color: Colors.grey)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text("Due Date (Optional)", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white70)),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _dateController,
                    readOnly: true,
                    style: const TextStyle(color: Colors.white),
                    onTap: () => _selectDate(context),
                    decoration: InputDecoration(
                      hintText: "Select Date (YYYY-MM-DD)",
                      hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                      prefixIcon: const Icon(Icons.calendar_today, color: Colors.blue),
                      enabledBorder: OutlineInputBorder(borderSide: const BorderSide(color: inputBorderColor), borderRadius: BorderRadius.circular(12)),
                      focusedBorder: OutlineInputBorder(borderSide: const BorderSide(color: Colors.blue), borderRadius: BorderRadius.circular(12)),
                    ),
                  )
                ],
              ),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(20),
              margin: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(15),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 10)]
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Project Goals", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                  const Text("Define key objectives. Each goal becomes an initial task on the board.", style: TextStyle(color: Colors.grey, fontSize: 13)),
                  const SizedBox(height: 16),
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: goals.length,
                    itemBuilder: (BuildContext context, int index) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF262626),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: inputBorderColor),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text("Goal #${index + 1}", style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
                                const Spacer(),
                                IconButton(
                                  onPressed: () => setState(() => goals.removeAt(index)),
                                  icon: const Icon(Icons.delete, color: Colors.red, size: 20),
                                ),
                              ],
                            ),
                            TextField(
                              style: const TextStyle(color: Colors.white),
                              onChanged: (val) => goals[index].title = val,
                              decoration: InputDecoration(
                                labelText: "Goal Title",
                                labelStyle: const TextStyle(color: Colors.white38),
                                hintText: "e.g., Design System",
                                hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              style: const TextStyle(color: Colors.white),
                              onChanged: (val) => goals[index].description = val,
                              decoration: InputDecoration(
                                labelText: "Goal Description (optional)",
                                labelStyle: const TextStyle(color: Colors.white38),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () {
                        setState(() {
                          goals.add(ProjectGoal());
                        });
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.blue,
                        side: const BorderSide(color: Colors.blue),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      icon: const Icon(Icons.add),
                      label: const Text("Add Project Goal"),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _projectCreate,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue.shade700,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text("Create Project", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text("Cancel", style: TextStyle(color: Colors.white60)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Future<void> _projectCreate() async {
    if (_projectNameController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Project name is required")));
      return;
    }

    List<Map<String, dynamic>> goalListAsMaps = goals.map((goal) => goal.toJson()).toList();
    try {
      String response = await TaskManagerData.projectCreate(
        _projectNameController.text,
        _projectDescriptionController.text,
        _projectPrivacyController.text.isEmpty ? "private" : _projectPrivacyController.text,
        _isoDateForDb,
        goalListAsMaps
      );
      var jsonObject = json.decode(response);

      if (jsonObject["_id"] != null) {
        if (!mounted) return;
        Navigator.pushReplacementNamed(context, Routes.projectsScreen, arguments: jsonObject["_id"]);
      } else {
        throw Exception("Failed to parse project ID from response");
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceAll("Exception: ", "")),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _selectDate(BuildContext context) async {
    DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );

    if (picked != null) {
      setState(() {
        _dateController.text = "${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}";
        _isoDateForDb = picked.toUtc().toIso8601String();
      });
    }
  }
}

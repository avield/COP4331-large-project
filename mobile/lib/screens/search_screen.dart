import 'dart:convert';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../utils/get_api.dart';
import '../utils/debouncer.dart';
import 'package:taskademia/routes/routes.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SearchMainPage(),
    );
  }
}

class SearchMainPage extends StatefulWidget {
  const SearchMainPage({super.key});

  @override
  _SearchMainPageState createState() => _SearchMainPageState();
}

class _SearchMainPageState extends State<SearchMainPage> {
  String errorMessage = '';
  bool _isSearching = false;
  final SearchController _searchController = SearchController();
  final _debouncer = Debouncer(milliseconds: 500);
  final ValueNotifier<GlobalSearchResponse?> _searchNotifier = ValueNotifier(null);

  List<dynamic> users = [];
  List<dynamic> projects = [];

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
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        title: SearchAnchor(
          searchController: _searchController,
          builder: (context, controller) {
            return SearchBar(
              controller: controller,
              hintText: "Search users, projects...",
              onTap: () => controller.openView(),
              onChanged: (val) => controller.openView(),
              leading: const Icon(Icons.search),
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
                        ...data.users.map((u) => ListTile(
                          leading: CircleAvatar(child: Text(u['profile']['displayName'][0])),
                          title: Text(u['profile']['displayName']),
                          subtitle: Text(u['email']),
                          onTap: () => Navigator.pushNamed(context, Routes.projectsScreen, arguments: u["id"]),
                        )),
                      ],
                      if (data.projects.isNotEmpty) ...[
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                          child: Text("PROJECTS", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey[600])),
                        ),
                        ...data.projects.map((p) => ListTile(
                          leading: const Icon(Icons.folder),
                          title: Text(p['name']),
                          subtitle: Text(p['description'], maxLines: 1),
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
      ),
      body: const Center(
        child: Text("Start searching for users or projects above."),
      ),
    );
  }
}

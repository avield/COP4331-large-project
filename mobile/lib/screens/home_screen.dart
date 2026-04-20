import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:persistent_bottom_nav_bar_v2/persistent_bottom_nav_bar_v2.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:taskademia/screens/dashboard_screen.dart';
import 'package:taskademia/screens/notifications_screen.dart';
import 'package:taskademia/screens/profile_screen.dart';
import '../utils/get_api.dart';
import '../utils/url_utils.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String displayName = '';
  String profilePictureUrl = '';

  @override
  void initState() {
    super.initState();
    _initHome();
  }

  Future<void> _initHome() async {
    try {
      String response = await TaskManagerData.me();
      var jsonObject = json.decode(response);
      
      // API 'me' response typically has profile info inside 'user' or directly
      var data = jsonObject['user'] ?? jsonObject;
      
      if (!mounted) return;
      setState(() {
        displayName = data["displayName"] ?? '';
        profilePictureUrl = UrlUtils.getFullUrl(data["profilePictureUrl"]);
      });
    } catch (e) {
      debugPrint("Error initializing Home: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    // Premium colors - forcing a darker, more sophisticated look for the nav bar
    final activeColor = Colors.blue.shade400;
    final inactiveColor = isDark ? Colors.white30 : Colors.grey.shade500;
    final navBgColor = isDark ? const Color(0xFF1A1A1A) : const Color(0xFF1E1E1E); // Always dark-ish for premium feel

    return PersistentTabView(
      tabs: [
        PersistentTabConfig(
          screen: const DashboardScreen(),
          item: ItemConfig(
            icon: Icon(LucideIcons.layoutDashboard),
            activeForegroundColor: activeColor,
            inactiveForegroundColor: inactiveColor,
            title: "Home",
          ),
        ),
        PersistentTabConfig(
          screen: const NotificationsScreen(),
          item: ItemConfig(
            icon: Icon(LucideIcons.bell),
            activeForegroundColor: activeColor,
            inactiveForegroundColor: inactiveColor,
            title: "Alerts",
          ),
        ),
        PersistentTabConfig(
          screen: const ProfileScreen(),
          item: ItemConfig(
            icon: Container(
              padding: const EdgeInsets.all(1),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isDark ? Colors.white10 : Colors.black12,
                  width: 1.5,
                ),
              ),
              child: CircleAvatar(
                radius: 11,
                backgroundColor: isDark ? const Color(0xFF262626) : Colors.blue.shade50,
                backgroundImage: profilePictureUrl.isNotEmpty 
                    ? NetworkImage(profilePictureUrl) 
                    : null,
                child: (profilePictureUrl.isEmpty)
                    ? Text(
                        displayName.isNotEmpty ? displayName[0].toUpperCase() : '?',
                        style: TextStyle(
                          fontSize: 9, 
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.blue.shade300 : Colors.blue.shade700
                        ),
                      )
                    : null,
              ),
            ),
            activeForegroundColor: activeColor,
            inactiveForegroundColor: inactiveColor,
            title: "Me",
          ),
        ),
      ],
      backgroundColor: navBgColor,
      navBarBuilder: (navBarConfig) => Style7BottomNavBar(
        navBarConfig: navBarConfig,
        navBarDecoration: NavBarDecoration(
          color: navBgColor,
          borderRadius: BorderRadius.circular(8),
          boxShadow: [
            BoxShadow(
              color: Colors.black26,
              blurRadius: 10,
            ),
          ],
        ),
        itemAnimationProperties: ItemAnimation(
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeInOut,
        )
      ),
    );
  }
}

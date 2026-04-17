import 'package:flutter/material.dart';
import 'package:taskademia/screens/landing_screen.dart';
import 'package:taskademia/screens/login_screen.dart';
import 'package:taskademia/screens/register_screen.dart';
import 'package:taskademia/screens/home_screen.dart';
import 'package:taskademia/screens/dashboard_screen.dart';
import 'package:taskademia/screens/projects_screen.dart';
import 'package:taskademia/screens/project_create_screen.dart';
import 'package:taskademia/screens/task_detail_screen.dart';
import 'package:taskademia/screens/notifications_screen.dart';
import 'package:taskademia/screens/profile_screen.dart';
import 'package:taskademia/screens/search_screen.dart';

class Routes {
  static const String landingScreen = '/';
  static const String loginScreen = '/login';
  static const String registerScreen = '/register';
  static const String homeScreen = '/home';
  static const String dashboardScreen = '/dashboard';
  static const String projectCreateScreen = '/projectCreate';
  static const String projectScreen = '/project';
  static const String projectsScreen = '/projects';
  static const String taskDetailScreen = '/taskDetail';
  static const String notificationsScreen = '/notifications';
  static const String profileScreen = '/profile';
  static const String searchScreen = '/search';

  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case landingScreen:
        return MaterialPageRoute(builder: (_) => const LandingScreen());
      case loginScreen:
        return MaterialPageRoute(builder: (_) => const LoginScreen());
      case registerScreen:
        return MaterialPageRoute(builder: (_) => const RegisterScreen());
      case homeScreen:
        return MaterialPageRoute(builder: (_) => const HomeScreen());
      case dashboardScreen:
        return MaterialPageRoute(builder: (_) => const DashboardScreen());
      case projectCreateScreen:
        return MaterialPageRoute(builder: (_) => const ProjectCreateScreen());
      case projectsScreen:
        final String id = settings.arguments as String;
        return MaterialPageRoute(
        builder: (_) => ProjectsScreen(projectId: id),
        );
      case taskDetailScreen:
        final Map<String, dynamic> args = settings.arguments as Map<String, dynamic>;
        return MaterialPageRoute(
          builder: (_) => TaskDetailScreen(
            taskId: args['taskId'],
            projectId: args['projectId'],
            initialData: args['initialData'],
            projectMembers: args['projectMembers'] ?? [],
          ),
        );
      case notificationsScreen:
        return MaterialPageRoute(builder: (_) => const NotificationsScreen());
      case profileScreen:
        final String? userId = settings.arguments as String?;
        return MaterialPageRoute(builder: (_) => ProfileScreen(userId: userId));
      case searchScreen:
        return MaterialPageRoute(builder: (_) => const SearchScreen());

      default:
        return MaterialPageRoute(
          builder: (_) => Scaffold(
            body: Center(child: Text('No route defined for ${settings.name}')),
          ),
        );
    }
  }
}

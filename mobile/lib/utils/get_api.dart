import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:taskademia/utils/token_service.dart';

class GlobalSearchResponse {
  final List<dynamic> users;
  final List<dynamic> projects;
  final List<dynamic> tasks;

  GlobalSearchResponse({required this.users, required this.projects, required this.tasks});

  factory GlobalSearchResponse.fromJson(Map<String, dynamic> json) {
    final results = json['results'] ?? {};
    return GlobalSearchResponse(
      users: results['users'] ?? [],
      projects: results['projects'] ?? [],
      tasks: results['tasks'] ?? [],
    );
  }
}

class TaskManagerData {
  static String _extractErrorMessage(http.Response response) {
    try {
      final body = jsonDecode(response.body);
      return body['message'] ?? body['error'] ?? 'Server Error: ${response.statusCode}';
    } catch (_) {
      return 'Server Error: ${response.statusCode}';
    }
  }

  static Future<String> register(String email, String password, String displayName) async {
    final url = Uri.parse('https://taskademia.app/api/auth/register/');

    try {
      final response = await http.post(
        url,
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: jsonEncode({
          "email": email,
          "password": password,
          "displayName": displayName,
        }),
      );

      if (response.statusCode == 201) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Registration failed: $e");
    }
  }

  static Future<String> login(String email, String password) async {
    final url = Uri.parse('https://taskademia.app/api/auth/login/');

    try {
      final response = await http.post(
        url,
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: jsonEncode({
          "email": email,
          "password": password,
        }),
      );

      if (response.statusCode == 201) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Login failed: $e");
    }
  }

  static Future<String> resendVerification(String email) async {
    final url = Uri.parse('https://taskademia.app/api/auth/resend-verification/');

    try {
      final response = await http.post(
        url,
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: jsonEncode({
          "email": email,
        }),
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to resend verification: $e");
    }
  }

  static Future<String> refresh() async {
    final url = Uri.parse('https://taskademia.app/api/auth/refresh/');

    try {
      final response = await http.post(
        url,
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to refresh token: $e");
    }
  }

  static Future<String> logout() async {
    final url = Uri.parse('https://taskademia.app/api/auth/logout/');

    try {
      final response = await http.post(
        url,
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Logout failed: $e");
    }
  }

  static Future<String> deleteAccount() async {
    final url = Uri.parse('https://taskademia.app/api/users/me/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.delete(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Delete account failed: $e");
    }
  }

  static Future<String> forgotPassword(String email) async {
    final url = Uri.parse('https://taskademia.app/api/auth/forgot-password/');

    try {
      final response = await http.post(
        url,
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: jsonEncode({
          "email": email,
        }),
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Forgot password request failed: $e");
    }
  }

  static Future<String> me() async {
    final url = Uri.parse('https://taskademia.app/api/auth/me/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.get(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to fetch user data: $e");
    }
  }

  static Future<String> projects() async {
    final url = Uri.parse('https://taskademia.app/api/projects/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.get(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to fetch projects: $e");
    }
  }

  static Future<String> projectCreate(
      String name,
      String description,
      String visibility,
      String dueDate,
      List<Map<String, dynamic>> goals,
      List<Map<String, dynamic>> invitedMembers) async {
    final url = Uri.parse('https://taskademia.app/api/projects/create/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.post(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
        body: jsonEncode({
          "name": name,
          "description": description,
          "visibility": visibility,
          "dueDate": dueDate,
          "goals": goals,
          "invitedMembers": invitedMembers,
        }),
      );

      if (response.statusCode == 201) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to create project: $e");
    }
  }

  static Future<String> projectById(String projectId) async {
    final url = Uri.parse('https://taskademia.app/api/projects/$projectId/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.get(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to fetch project: $e");
    }
  }

  static Future<String> projectUpdate(
    String projectId,
    String name,
    String description,
    String visibility,
    String dueDate,
    String recruitingStatus,
    String status,
    List<String> tags,
    List<String> lookingForRoles,
    Map<String, dynamic> settings,
  ) async {
    final url = Uri.parse('https://taskademia.app/api/projects/$projectId/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.put(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
        body: jsonEncode({
          "name": name,
          "description": description,
          "visibility": visibility,
          "dueDate": dueDate,
          "recruitingStatus": recruitingStatus,
          "status": status,
          "tags": tags,
          "lookingForRoles": lookingForRoles,
          "settings": settings,
        }),
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to update project: $e");
    }
  }

  static Future<String> projectDelete(String projectId) async {
    final url = Uri.parse('https://taskademia.app/api/projects/$projectId/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.delete(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to delete project: $e");
    }
  }

  static Future<String> projectDetails(String projectId) async {
    final url = Uri.parse('https://taskademia.app/api/projects/$projectId/details/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.get(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to fetch project details: $e");
    }
  }


  static Future<String> projectChatMessages(String projectId) async {
    final url = Uri.parse('https://taskademia.app/api/projects/$projectId/chat/messages/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.get(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to fetch project chat: $e");
    }
  }

  static Future<String> projectJoin(String projectId) async {
    final url = Uri.parse('https://taskademia.app/api/projects/$projectId/join/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.post(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to join project: $e");
    }
  }

  static Future<String> projectManage(String projectId) async {
    final url = Uri.parse('https://taskademia.app/api/projects/$projectId/manage/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.get(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to manage project: $e");
    }
  }

  static Future<String> projectJoinDeny(String projectId, String membershipId) async {
    final url = Uri.parse('https://taskademia.app/api/projects/$projectId/members/$membershipId/deny/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.delete(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to deny join request: $e");
    }
  }

  static Future<String> projectJoinApprove(String projectId, String membershipId) async {
    final url = Uri.parse('https://taskademia.app/api/projects/$projectId/members/$membershipId/approve/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.patch(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to approve join request: $e");
    }
  }

  static Future<String> tasks(String projectId, String title,
      String description, String dueDate, List<String> assignedToUserIds,
      String status, String priority, List<String> tags, String roleRequired,
      String goalId) async {
    final url = Uri.parse('https://taskademia.app/api/tasks/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.post(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
        body: jsonEncode({
          "projectId": projectId,
          "title": title,
          "description": description,
          "dueDate": dueDate,
          "assignedToUserIds": assignedToUserIds,
          "status": status,
          "priority": priority,
          "tags": tags,
          "rolesRequired": roleRequired,
          "goalId": goalId,
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to create task: $e");
    }
  }

  static Future<String> tasksProject(String projectId) async {
    final url = Uri.parse('https://taskademia.app/api/tasks/project/$projectId/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.get(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to fetch project tasks: $e");
    }
  }

  static Future<String> tasksTodo() async {
    final url = Uri.parse('https://taskademia.app/api/tasks/todo/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.get(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to fetch todo tasks: $e");
    }
  }

  static Future<String> tasksById(String taskId) async {
    final url = Uri.parse('https://taskademia.app/api/tasks/$taskId/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.get(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to fetch task: $e");
    }
  }

  static Future<String> tasksByIdUpdate(String taskId, Map<String, dynamic> data) async {
    final url = Uri.parse('https://taskademia.app/api/tasks/$taskId/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.put(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
        body: jsonEncode(data),
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to update task: $e");
    }
  }

  static Future<String> tasksByIdDelete(String taskId) async {
    final url = Uri.parse('https://taskademia.app/api/tasks/$taskId/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.delete(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to delete task: $e");
    }
  }

  static Future<String> subtaskCreate(String taskId, String title) async {
    final url = Uri.parse('https://taskademia.app/api/tasks/$taskId/subtasks/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.post(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
        body: jsonEncode({"title": title}),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to create subtask: $e");
    }
  }

  static Future<String> subtaskToggle(String taskId, String subtaskId, bool isDone) async {
    final url = Uri.parse('https://taskademia.app/api/tasks/$taskId/subtasks/$subtaskId/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.patch(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
        body: jsonEncode({"isDone": isDone}),
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to toggle subtask: $e");
    }
  }

  static Future<String> subtaskDelete(String taskId, String subtaskId) async {
    final url = Uri.parse('https://taskademia.app/api/tasks/$taskId/subtasks/$subtaskId/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.delete(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to delete subtask: $e");
    }
  }

  static Future<String> notifications() async {
    final url = Uri.parse('https://taskademia.app/api/notifications/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.get(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to fetch notifications: $e");
    }
  }

  static Future<String> projectInvitations() async {
    final url = Uri.parse('https://taskademia.app/api/project-members/me/invitations/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.get(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to fetch invitations: $e");
    }
  }

  static Future<String> notificationMarkAllRead() async {
    final url = Uri.parse('https://taskademia.app/api/notifications/read-all/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.patch(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to mark all notifications read: $e");
    }
  }

  static Future<String> notificationDelete(String notificationId) async {
    final url = Uri.parse('https://taskademia.app/api/notifications/$notificationId/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.delete(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to delete notification: $e");
    }
  }

  static Future<String> notificationClearAll() async {
    final url = Uri.parse('https://taskademia.app/api/notifications/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.delete(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to clear notifications: $e");
    }
  }

  static Future<String> notificationAccept(String membershipId) async {
    final url = Uri.parse('https://taskademia.app/api/project-members/$membershipId/accept/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.post(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to accept invitation: $e");
    }
  }

  static Future<String> notificationReject(String membershipId) async {
    final url = Uri.parse('https://taskademia.app/api/project-members/$membershipId/reject/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.delete(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to reject invitation: $e");
    }
  }

  static Future<String> projectMembers(String projectId) async {
    final url = Uri.parse('https://taskademia.app/api/project-members/project/$projectId/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.get(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to fetch project members: $e");
    }
  }

  static Future<String> projectMembersInvite(String projectId, String userId,
      String role, Map<String, dynamic> permissions) async {
    final url = Uri.parse('https://taskademia.app/api/project-members/project/$projectId/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.post(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
        body: jsonEncode({
          "userId": userId,
          "role": role,
          "permissions": permissions,
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to invite member: $e");
    }
  }

  static Future<String> projectMembersJoin(String projectId) async {
    final url = Uri.parse('https://taskademia.app/api/project-members/project/$projectId/join/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.post(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to join project members: $e");
    }
  }

  static Future<String> projectMembersManage(String projectId) async {
    final url = Uri.parse('https://taskademia.app/api/project-members/project/$projectId/manage/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.get(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to manage project members: $e");
    }
  }

  static Future<String> projectMembersUpdate(String membershipId, String role, Map<String, dynamic> permissions) async {
    final url = Uri.parse('https://taskademia.app/api/project-members/$membershipId/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.put(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
        body: jsonEncode({
          "role": role,
          "permissions": permissions,
        }),
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to update project member: $e");
    }
  }

  static Future<String> projectMembersRemove(String membershipId) async {
    final url = Uri.parse('https://taskademia.app/api/project-members/$membershipId/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.delete(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to remove project member: $e");
    }
  }

  static Future<String> projectMembersDeny(String membershipId) async {
    final url = Uri.parse('https://taskademia.app/api/project-members/$membershipId/deny/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.delete(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to deny project membership: $e");
    }
  }

  static Future<String> goals(String projectId, String title, String description) async {
    final url = Uri.parse('https://taskademia.app/api/goals/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.post(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
        body: jsonEncode({
          "projectId": projectId,
          "title": title,
          "description": description,
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to create goal: $e");
    }
  }

  static Future<String> projectGoals(String projectId) async {
    final url = Uri.parse('https://taskademia.app/api/goals/project/$projectId/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.get(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to fetch project goals: $e");
    }
  }

  static Future<String> projectGoalsUpdate(String goalId, String title,
      String description, int order) async {
    final url = Uri.parse('https://taskademia.app/api/goals/$goalId/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.put(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
        body: jsonEncode({
          "title": title,
          "description": description,
          "order": order,
        }),
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to update goal: $e");
    }
  }

  static Future<String> projectGoalsDelete(String goalId) async {
    final url = Uri.parse('https://taskademia.app/api/goals/$goalId/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.delete(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to delete goal: $e");
    }
  }

  static Future<String> profile() async {
    final url = Uri.parse('https://taskademia.app/api/profile/me/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.get(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to fetch profile: $e");
    }
  }

  static Future<String> profileUpdate(String displayName, String school,
      String aboutMe, String preferredRoles, String? profilePicturePath) async {
    final url = Uri.parse('https://taskademia.app/api/profile/update/');
    String? token = await TokenService.getToken();

    try {
      var request = http.MultipartRequest('PUT', url);
      request.headers.addAll({
        "Accept": "application/json",
        "Authorization": "Bearer $token",
      });

      request.fields['displayName'] = displayName;
      request.fields['school'] = school;
      request.fields['aboutMe'] = aboutMe;
      request.fields['preferredRoles'] = preferredRoles;

      if (profilePicturePath != null && profilePicturePath.isNotEmpty) {
        request.files.add(await http.MultipartFile.fromPath(
          'profilePicture',
          profilePicturePath,
        ));
      }

      var streamedResponse = await request.send();
      var response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to update profile: $e");
    }
  }

  static Future<String> profileDetails(String userId) async {
    final url = Uri.parse('https://taskademia.app/api/users/$userId/');
    String? token = await TokenService.getToken();

    try {
      final response = await http.get(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return response.body;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Failed to fetch user details: $e");
    }
  }

  static Future<GlobalSearchResponse> search(String query) async {
    final url = Uri.parse('https://taskademia.app/api/search/?q=$query&type=all&usersPage=1&projectsPage=1&tasksPage=1');
    String? token = await TokenService.getToken();

    try {
      final response = await http.get(
        url,
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> jsonObject = jsonDecode(response.body);
        return GlobalSearchResponse.fromJson(jsonObject);
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Search failed: $e");
    }
  }
}

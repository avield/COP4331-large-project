import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:image_picker/image_picker.dart';
import '../utils/get_api.dart';
import '../utils/token_service.dart';
import '../utils/url_utils.dart';
import 'package:taskademia/routes/routes.dart';

class ProfileScreen extends StatefulWidget {
  final String? userId;
  const ProfileScreen({super.key, this.userId});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ProfileMainPage(userId: widget.userId),
    );
  }
}

class ProfileMainPage extends StatefulWidget {
  final String? userId;
  const ProfileMainPage({super.key, this.userId});

  @override
  State<ProfileMainPage> createState() => _ProfileMainPageState();
}

class _ProfileMainPageState extends State<ProfileMainPage> {
  String errorMessage = '';
  bool _isEditing = false;
  bool _isLoading = true;
  bool get _isOwnProfile => widget.userId == null;

  String email = '', displayName = '', school = '', aboutMe = '', preferredRoles = '', profilePictureUrl = '';
  late TextEditingController _nameController;
  late TextEditingController _schoolController;
  late TextEditingController _aboutMeController;
  late TextEditingController _preferredRolesController;
  File? _imageFile;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _schoolController = TextEditingController();
    _aboutMeController = TextEditingController();
    _preferredRolesController = TextEditingController();
    _initProfile();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _schoolController.dispose();
    _aboutMeController.dispose();
    _preferredRolesController.dispose();
    super.dispose();
  }

  Future<void> _initProfile() async {
    setState(() => _isLoading = true);
    try {
      String response;
      if (_isOwnProfile) {
        response = await TaskManagerData.profile();
      } else {
        response = await TaskManagerData.profileDetails(widget.userId!);
      }
      
      var jsonObject = json.decode(response);

      if (!mounted) return;
      setState(() {
        final data = _isOwnProfile ? jsonObject : (jsonObject['user'] ?? jsonObject);
        final profile = data['profile'] ?? data;
        
        displayName = profile["displayName"] ?? data["displayName"] ?? '';
        email = data["email"] ?? '';
        school = profile["school"] ?? data["school"] ?? '';
        aboutMe = profile["aboutMe"] ?? data["aboutMe"] ?? '';
        
        // Handle preferredRoles safely (could be List or String)
        var roles = profile["preferredRoles"] ?? data["preferredRoles"];
        if (roles is List) {
          preferredRoles = roles.join(", ");
        } else {
          preferredRoles = roles ?? '';
        }

        profilePictureUrl = profile["profilePictureUrl"] ?? data["profilePictureUrl"] ?? '';
        
        _nameController.text = displayName;
        _schoolController.text = school;
        _aboutMeController.text = aboutMe;
        _preferredRolesController.text = preferredRoles;
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

  Future<void> _pickProfileImage() async {
    final ImagePicker picker = ImagePicker();
    final XFile? image = await picker.pickImage(
        source: ImageSource.gallery,
        maxHeight: 1024,
        maxWidth: 1024
    );

    if (image != null) {
      setState(() {
        _imageFile = File(image.path);
      });
    }
  }

  Future<void> _saveProfile() async {
    setState(() => _isLoading = true);
    try {
      String response = await TaskManagerData.profileUpdate(
        _nameController.text,
        _schoolController.text,
        _aboutMeController.text,
        _preferredRolesController.text,
        _imageFile?.path,
      );
      var jsonObject = json.decode(response);
      final profile = jsonObject["profile"] ?? jsonObject;

      if (!mounted) return;
      setState(() {
        displayName = profile["displayName"] ?? displayName;
        school = profile["school"] ?? school;
        aboutMe = profile["aboutMe"] ?? aboutMe;
        final updatedRoles = profile["preferredRoles"];
        preferredRoles = updatedRoles is List ? updatedRoles.join(", ") : (updatedRoles ?? preferredRoles);
        profilePictureUrl = profile["profilePictureUrl"] ?? profilePictureUrl;
        _isEditing = false;
        _imageFile = null;
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

  void _handleLogout() async {
    await TokenService.logout();
    if (!mounted) return;
    Navigator.of(context, rootNavigator: true)
        .pushNamedAndRemoveUntil(Routes.landingScreen, (route) => false);
  }

  Widget _buildProfileAvatar(bool isDark) {
    if (_imageFile != null) {
      return CircleAvatar(
        radius: 60,
        backgroundColor: isDark ? Colors.white.withValues(alpha: 0.1) : Colors.blue.shade100,
        backgroundImage: FileImage(_imageFile!),
      );
    }

    final fullUrl = UrlUtils.getFullUrl(profilePictureUrl);
    final fallbackIcon = Icon(
      LucideIcons.user,
      size: 60,
      color: isDark ? Colors.white70 : Colors.blue.shade700,
    );

    return CircleAvatar(
      radius: 60,
      backgroundColor: isDark ? Colors.white.withValues(alpha: 0.1) : Colors.blue.shade100,
      child: ClipOval(
        child: fullUrl.isNotEmpty
            ? Image.network(
                fullUrl,
                width: 120,
                height: 120,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => fallbackIcon,
              )
            : fallbackIcon,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final canGoBack = Navigator.of(context).canPop();

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).appBarTheme.backgroundColor,
        elevation: 0,
        title: Text("Profile", style: TextStyle(color: isDark ? Colors.white : Colors.black, fontWeight: FontWeight.bold)),
        automaticallyImplyLeading: false,
        leading: canGoBack
            ? IconButton(
                icon: Icon(Icons.arrow_back, color: isDark ? Colors.white : Colors.black),
                onPressed: () => Navigator.maybePop(context),
              )
            : null,
        actions: [
          if (_isOwnProfile && !_isEditing)
            IconButton(
              icon: const Icon(LucideIcons.logOut, color: Colors.red),
              onPressed: _handleLogout,
            ),
        ],
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _buildProfileHeader(isDark),
                const SizedBox(height: 24),
                _isEditing ? _buildEditForm(isDark) : _buildProfileDetails(isDark),
                const SizedBox(height: 24),
                if (_isOwnProfile && !_isEditing) _buildDangerZone(),
              ],
            ),
          ),
      bottomNavigationBar: errorMessage.isNotEmpty
          ? Container(
              color: Colors.red,
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(child: Text(errorMessage, style: const TextStyle(color: Colors.white))),
                  IconButton(icon: const Icon(Icons.close, color: Colors.white), onPressed: () => setState(() => errorMessage = '')),
                ],
              ),
            )
          : null,
    );
  }

  Widget _buildProfileHeader(bool isDark) {
    return Center(
      child: Column(
        children: [
          Stack(
            children: [
              _buildProfileAvatar(isDark),
              if (_isEditing)
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: GestureDetector(
                    onTap: _pickProfileImage,
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade700, 
                        shape: BoxShape.circle, 
                        border: Border.all(color: isDark ? const Color(0xFF121212) : Colors.white, width: 2)
                      ),
                      child: const Icon(LucideIcons.camera, color: Colors.white, size: 20),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          if (_isOwnProfile && !_isEditing) ...[
            Text(displayName, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            Text(email, style: TextStyle(color: isDark ? Colors.white60 : Colors.grey.shade600, fontSize: 14)),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () => setState(() => _isEditing = true),
              icon: const Icon(LucideIcons.pencil, size: 16),
              label: const Text("Edit Profile"),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue.shade700,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              ),
            ),
          ] else if (!_isOwnProfile) ...[
            Text(displayName, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            Text("External Member", style: TextStyle(color: Colors.blue.shade400, fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton.icon(
                  onPressed: () {
                    // TODO: Implement messaging/invite
                  },
                  icon: const Icon(LucideIcons.mail, size: 16),
                  label: const Text("Message"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue.shade700,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  ),
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: () {
                    // TODO: Implement project invite
                  },
                  icon: const Icon(LucideIcons.plus, size: 16),
                  label: const Text("Invite"),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                    side: BorderSide(color: isDark ? Colors.white24 : Colors.grey.shade300),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildProfileDetails(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(20),
        boxShadow: isDark ? [] : [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildDetailRow(LucideIcons.user, "About Me", aboutMe.isEmpty ? "No bio provided" : aboutMe, isDark),
          Divider(height: 32, color: isDark ? Colors.white.withValues(alpha: 0.1) : Colors.grey.shade200),
          _buildDetailRow(LucideIcons.graduationCap, "School", school.isEmpty ? "Not specified" : school, isDark),
          Divider(height: 32, color: isDark ? Colors.white.withValues(alpha: 0.1) : Colors.grey.shade200),
          _buildDetailRow(LucideIcons.bookOpen, "Preferred Roles", preferredRoles.isEmpty ? "No roles listed" : preferredRoles, isDark),
        ],
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value, bool isDark) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: Colors.blue.shade400),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: TextStyle(color: isDark ? Colors.white38 : Colors.grey.shade500, fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(value, style: const TextStyle(fontSize: 16, height: 1.4)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildEditForm(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(20),
        boxShadow: isDark ? [] : [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildTextField(_nameController, "Display Name", LucideIcons.user, "Your full name"),
          const SizedBox(height: 20),
          _buildTextField(_schoolController, "School", LucideIcons.graduationCap, "e.g. UCF, MIT"),
          const SizedBox(height: 20),
          _buildTextField(_aboutMeController, "About Me", LucideIcons.info, "Tell us about yourself...", maxLines: 3),
          const SizedBox(height: 20),
          _buildTextField(_preferredRolesController, "Preferred Roles", LucideIcons.bookOpen, "Frontend, Backend, etc."),
          const SizedBox(height: 12),
          Text("Separate roles with commas.", style: TextStyle(color: isDark ? Colors.white38 : Colors.grey, fontSize: 12)),
          const SizedBox(height: 32),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() {
                    _isEditing = false;
                    _imageFile = null;
                  }),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    side: BorderSide(color: isDark ? Colors.white24 : Colors.grey.shade300),
                  ),
                  child: const Text("Cancel"),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  onPressed: _saveProfile,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue.shade700,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text("Save"),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, IconData icon, String hint, {int maxLines = 1}) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: Icon(icon, size: 20),
      ),
    );
  }

  Widget _buildDangerZone() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.red.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.red.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Danger Zone", style: TextStyle(color: Colors.red, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text("Permanently remove your account and all associated data. This action cannot be undone.", style: TextStyle(color: Colors.redAccent, fontSize: 13)),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _showDeleteDialog,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text("Delete Account"),
            ),
          ),
        ],
      ),
    );
  }

  void _showDeleteDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Delete Account?"),
        content: const Text("Are you absolutely sure? This will permanently delete your profile and all your project contributions."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Cancel")),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              try {
                await TaskManagerData.deleteAccount();
                await TokenService.logout();
                if (!mounted) return;
                Navigator.of(context, rootNavigator: true)
                    .pushNamedAndRemoveUntil(Routes.landingScreen, (route) => false);
              } catch (e) {
                if (!mounted) return;
                setState(() => errorMessage = e.toString().replaceAll("Exception: ", ""));
              }
            },
            child: const Text("Delete Everything", style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}

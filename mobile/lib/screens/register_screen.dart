import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../utils/get_api.dart';
import 'package:taskademia/routes/routes.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: RegisterMainPage(),
    );
  }
}

class RegisterMainPage extends StatefulWidget {
  const RegisterMainPage({super.key});

  @override
  State<RegisterMainPage> createState() => _RegisterMainPageState();
}

class _RegisterMainPageState extends State<RegisterMainPage> {
  String errorMessage = '';
  bool isLoading = false;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _performRegistration() async {
    setState(() {
      isLoading = true;
      errorMessage = '';
    });

    try {
      String response = await TaskManagerData.register(
          _emailController.text.trim(),
          _passwordController.text,
          _nameController.text.trim());
      var jsonObject = json.decode(response);

      if (jsonObject["id"] != null) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Account created! Please sign in.")),
        );
        Navigator.pushReplacementNamed(context, Routes.loginScreen);
      } else {
        setState(() => errorMessage = "Registration failed: Invalid server response");
      }
    } catch (e) {
      if (mounted) setState(() => errorMessage = e.toString().replaceAll("Exception: ", ""));
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return SingleChildScrollView(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 60),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.blue.shade700.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(LucideIcons.userPlus, size: 48, color: Colors.blue.shade700),
            ),
            const SizedBox(height: 24),
            Text(
              "Create Account",
              style: TextStyle(
                fontSize: 28, 
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : Colors.black,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              "Join Taskademia to start managing your goals",
              style: TextStyle(color: isDark ? Colors.white38 : Colors.grey),
            ),
            const SizedBox(height: 40),
            Form(
              key: _formKey,
              child: Column(
                children: [
                  _buildTextField(_nameController, "Full Name", LucideIcons.user, false),
                  const SizedBox(height: 16),
                  _buildTextField(_emailController, "Email Address", LucideIcons.mail, false, keyboardType: TextInputType.emailAddress),
                  const SizedBox(height: 16),
                  _buildTextField(_passwordController, "Password", LucideIcons.lock, true, 
                    obscure: _obscurePassword, 
                    onToggle: () => setState(() => _obscurePassword = !_obscurePassword)
                  ),
                  const SizedBox(height: 16),
                  _buildTextField(_confirmController, "Confirm Password", LucideIcons.shieldCheck, true,
                    obscure: _obscureConfirm,
                    onToggle: () => setState(() => _obscureConfirm = !_obscureConfirm),
                    validator: (val) => val != _passwordController.text ? "Passwords do not match" : null
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton(
                onPressed: isLoading ? null : () {
                  if (_formKey.currentState!.validate()) _performRegistration();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue.shade700,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: isLoading 
                  ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) 
                  : const Text("Sign Up", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(height: 16),
            if (errorMessage.isNotEmpty)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(LucideIcons.circleAlert, size: 16, color: Colors.red),
                    const SizedBox(width: 8),
                    Expanded(child: Text(errorMessage, style: const TextStyle(color: Colors.red, fontSize: 13))),
                  ],
                ),
              ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  "Already have an account?",
                  style: TextStyle(color: isDark ? Colors.white70 : Colors.black87),
                ),
                TextButton(
                  onPressed: () => Navigator.pushNamed(context, Routes.loginScreen),
                  child: Text("Sign In", style: TextStyle(color: Colors.blue.shade400, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(
                "Go Back", 
                style: TextStyle(color: isDark ? Colors.white24 : Colors.grey),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, IconData icon, bool isPassword, {
    bool obscure = false, 
    VoidCallback? onToggle,
    TextInputType keyboardType = TextInputType.text,
    String? Function(String?)? validator
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return TextFormField(
      controller: controller,
      obscureText: obscure,
      keyboardType: keyboardType,
      style: TextStyle(color: isDark ? Colors.white : Colors.black),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: isDark ? Colors.white38 : Colors.grey),
        prefixIcon: Icon(icon, size: 20, color: isDark ? Colors.white38 : Colors.grey),
        filled: true,
        fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade50,
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: isDark ? Colors.white10 : Colors.grey.shade200),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.blue.shade700),
        ),
        suffixIcon: isPassword ? IconButton(
          icon: Icon(obscure ? LucideIcons.eye : LucideIcons.eyeOff, size: 20, color: isDark ? Colors.white38 : Colors.grey),
          onPressed: onToggle,
        ) : null,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
      validator: validator ?? (val) {
        if (val == null || val.isEmpty) return "This field is required";
        if (label == "Password" && val.length < 8) return "Password must be at least 8 chars";
        return null;
      },
    );
  }
}

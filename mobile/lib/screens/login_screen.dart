import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../utils/get_api.dart';
import '../utils/token_service.dart';
import 'package:taskademia/routes/routes.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: const LoginMainPage(),
    );
  }
}

class LoginMainPage extends StatefulWidget {
  const LoginMainPage({super.key});

  @override
  State<LoginMainPage> createState() => _LoginMainPageState();
}

class _LoginMainPageState extends State<LoginMainPage> {
  String errorMessage = '';
  bool isLoading = false;
  bool _obscurePassword = true;
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _performLogin() async {
    setState(() {
      isLoading = true;
      errorMessage = '';
    });

    try {
      String response = await TaskManagerData.login(_emailController.text.trim(), _passwordController.text);
      var jsonObject = json.decode(response);

      if (jsonObject["accessToken"] != null && jsonObject["accessToken"].toString().isNotEmpty) {
        await TokenService.saveToken(jsonObject["accessToken"]);
        if (!mounted) return;
        // Navigate to Home (which has the Nav Bar) instead of Dashboard directly
        Navigator.pushNamedAndRemoveUntil(context, Routes.homeScreen, (route) => false);
      } else {
        setState(() => errorMessage = "Login failed: Invalid server response");
      }
    } catch (e) {
      setState(() => errorMessage = e.toString().replaceAll("Exception: ", ""));
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
        height: MediaQuery.of(context).size.height,
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(LucideIcons.graduationCap, size: 64, color: Colors.blue.shade600),
            const SizedBox(height: 16),
            Text(
              "Welcome Back",
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black),
            ),
            Text(
              "Sign in to continue managing your projects",
              style: TextStyle(color: isDark ? Colors.white60 : Colors.grey),
            ),
            const SizedBox(height: 48),
            Form(
              key: _formKey,
              child: Column(
                children: [
                  TextFormField(
                    controller: _emailController,
                    style: TextStyle(color: isDark ? Colors.white : Colors.black),
                    decoration: const InputDecoration(
                      labelText: "Email Address",
                      prefixIcon: Icon(LucideIcons.mail, size: 20),
                    ),
                    keyboardType: TextInputType.emailAddress,
                    validator: (val) => val == null || !val.contains('@') ? "Enter a valid email" : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    style: TextStyle(color: isDark ? Colors.white : Colors.black),
                    decoration: InputDecoration(
                      labelText: "Password",
                      prefixIcon: const Icon(LucideIcons.lock, size: 20),
                      suffixIcon: IconButton(
                        icon: Icon(_obscurePassword ? LucideIcons.eye : LucideIcons.eyeOff, size: 20),
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      ),
                    ),
                    validator: (val) => val == null || val.isEmpty ? "Enter your password" : null,
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
                  if (_formKey.currentState!.validate()) _performLogin();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue.shade700,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: isLoading 
                  ? const CircularProgressIndicator(color: Colors.white) 
                  : const Text("Sign In", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(height: 16),
            if (errorMessage.isNotEmpty)
              Text(errorMessage, style: const TextStyle(color: Colors.red, fontSize: 13)),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text("Don't have an account?", style: TextStyle(color: isDark ? Colors.white70 : Colors.black87)),
                TextButton(
                  onPressed: () => Navigator.pushNamed(context, Routes.registerScreen),
                  child: Text("Sign Up", style: TextStyle(color: Colors.blue.shade400, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text("Go Back", style: TextStyle(color: isDark ? Colors.white38 : Colors.grey)),
            ),
          ],
        ),
      ),
    );
  }
}

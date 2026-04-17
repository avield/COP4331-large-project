import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:taskademia/routes/routes.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: const SingleChildScrollView(
        child: Column(
          children: [
            HeroSection(),
            FeatureSection(),
            OnboardingSection(),
            FooterSection(),
          ],
        ),
      ),
    );
  }
}

class HeroSection extends StatelessWidget {
  const HeroSection({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 80),
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: isDark 
            ? [const Color(0xFF1E1E1E), theme.scaffoldBackgroundColor]
            : [Colors.blue.shade50, Colors.white],
        ),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(LucideIcons.graduationCap, color: Colors.blue.shade700, size: 32),
              const SizedBox(width: 12),
              Text(
                "Taskademia",
                style: TextStyle(
                  fontSize: 32, 
                  fontWeight: FontWeight.bold, 
                  letterSpacing: -1,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
            ],
          ),
          const SizedBox(height: 40),
          Text(
            "Where teams get things done.",
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 42, 
              fontWeight: FontWeight.w900, 
              height: 1.1, 
              letterSpacing: -1.5,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
          const SizedBox(height: 20),
          Text(
            "Taskademia gives your team a shared space to manage projects, track progress, and ship faster—built specifically for academic collaboration.",
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 16, 
              color: isDark ? Colors.white70 : Colors.grey.shade700, 
              height: 1.5,
            ),
          ),
          const SizedBox(height: 40),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ElevatedButton(
                onPressed: () => Navigator.pushNamed(context, Routes.registerScreen),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue.shade700,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: const Text("Get Started", style: TextStyle(fontWeight: FontWeight.bold)),
              ),
              const SizedBox(width: 12),
              OutlinedButton(
                onPressed: () => Navigator.pushNamed(context, Routes.loginScreen),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  side: BorderSide(color: isDark ? Colors.white24 : Colors.grey.shade300),
                ),
                child: Text(
                  "Sign In", 
                  style: TextStyle(
                    color: isDark ? Colors.white : Colors.black, 
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class FeatureSection extends StatelessWidget {
  const FeatureSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        children: [
          _buildFeatureCard(
            context,
            LucideIcons.layoutDashboard,
            "Kanban Boards",
            "Visualize project sprints with drag-and-drop tasks across customizable columns.",
            Colors.blue,
          ),
          _buildFeatureCard(
            context,
            LucideIcons.users,
            "Team Collaboration",
            "Invite teammates, assign roles, and track contributions in real-time.",
            Colors.purple,
          ),
          _buildFeatureCard(
            context,
            LucideIcons.target,
            "Goal Tracking",
            "Define milestones and link tasks to overarching project goals for better visibility.",
            Colors.green,
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureCard(BuildContext context, IconData icon, String title, String description, Color color) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade100),
        boxShadow: isDark ? [] : [
          BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4))
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1), 
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title, 
                  style: TextStyle(
                    fontSize: 18, 
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description, 
                  style: TextStyle(
                    color: isDark ? Colors.white60 : Colors.grey.shade600, 
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class OnboardingSection extends StatelessWidget {
  const OnboardingSection({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(24),
      color: isDark ? const Color(0xFF1A1A1A) : Colors.grey.shade50,
      width: double.infinity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Ready to ship?", 
            style: TextStyle(
              fontSize: 24, 
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
          const SizedBox(height: 24),
          _buildStep(context, "01", "Create account", "Sign up with your student email or GitHub."),
          _buildStep(context, "02", "Start project", "Define your workspace and invite your team."),
          _buildStep(context, "03", "Ship together", "Complete tasks and reach your milestones."),
        ],
      ),
    );
  }

  Widget _buildStep(BuildContext context, String number, String title, String description) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            number, 
            style: TextStyle(
              fontSize: 24, 
              fontWeight: FontWeight.w900, 
              color: Colors.blue.shade300,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title, 
                  style: TextStyle(
                    fontSize: 18, 
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
                Text(
                  description, 
                  style: TextStyle(
                    color: isDark ? Colors.white60 : Colors.grey.shade600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class FooterSection extends StatelessWidget {
  const FooterSection({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.all(40),
      child: Column(
        children: [
          Divider(color: isDark ? Colors.white10 : Colors.grey.shade200),
          const SizedBox(height: 20),
          Text(
            "© 2026 Taskademia", 
            style: TextStyle(
              color: isDark ? Colors.white38 : Colors.grey.shade500, 
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            "COP4331 · Spring 2026", 
            style: TextStyle(
              color: isDark ? Colors.white24 : Colors.grey.shade400, 
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

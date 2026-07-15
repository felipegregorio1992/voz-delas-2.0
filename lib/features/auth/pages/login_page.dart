import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../services/auth_service.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _useEmail = true;

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _switchMode(bool useEmail) {
    if (_useEmail == useEmail) return;
    setState(() => _useEmail = useEmail);
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);

    // Salvar referências antes dos awaits
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    final router = GoRouter.of(context);

    try {
      final authService = ref.read(authServiceProvider);
      await authService.login(
        email: _useEmail ? _emailController.text.trim() : null,
        phone: !_useEmail ? _phoneController.text.trim() : null,
        password: _passwordController.text,
      );

      // Aguardar um frame para garantir que o token foi persistido
      await Future.delayed(const Duration(milliseconds: 100));

      if (mounted) router.go('/home');
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
      scaffoldMessenger.showSnackBar(
        SnackBar(
          content: Text('Erro ao fazer login: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleGoogleLogin() async {
    setState(() => _isLoading = true);

    final scaffoldMessenger = ScaffoldMessenger.of(context);
    final router = GoRouter.of(context);

    try {
      final authService = ref.read(authServiceProvider);
      await authService.loginWithGoogle();

      await Future.delayed(const Duration(milliseconds: 100));

      if (mounted) router.go('/home');
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
      final message = e.toString().replaceAll('Exception: ', '');
      if (!message.contains('cancelado') && !message.contains('popup_closed')) {
        scaffoldMessenger.showSnackBar(
          SnackBar(
            content: Text('Erro: $message'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Background image
          Image.asset(
            'assets/images/background.png',
            fit: BoxFit.cover,
          ),
          // Dark overlay for readability
          Container(color: Colors.black.withOpacity(0.45)),

          SafeArea(
            child: Column(
              children: [
                // Logo area — colada no topo
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Image.asset(
                    'assets/images/logo.png',
                    height: 72,
                    fit: BoxFit.contain,
                  ),
                ),

                // Form card — centralizado verticalmente no espaço restante
                Expanded(
                  child: Center(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                          const Text(
                            'Bem-vinda',
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Faça login para continuar',
                            style: TextStyle(fontSize: 14, color: Colors.white70),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 24),

                          // Toggle Email / Telefone — pill deslizante
                          _buildSlidingToggle(),
                          const SizedBox(height: 20),

                          // Input field (email or phone) — troca direta sem animação
                          _useEmail
                              ? _buildRoundedField(
                                  key: const ValueKey('email'),
                                  controller: _emailController,
                                  hint: 'Email',
                                  icon: Icons.email_outlined,
                                  keyboardType: TextInputType.emailAddress,
                                  validator: (v) {
                                    if (v == null || v.isEmpty) return 'Email é obrigatório';
                                    if (!v.contains('@')) return 'Email inválido';
                                    return null;
                                  },
                                )
                              : _buildRoundedField(
                                  key: const ValueKey('phone'),
                                  controller: _phoneController,
                                  hint: 'Telefone',
                                  icon: Icons.phone_outlined,
                                  keyboardType: TextInputType.phone,
                                  validator: (v) {
                                    if (v == null || v.isEmpty) return 'Telefone é obrigatório';
                                    return null;
                                  },
                                ),
                          const SizedBox(height: 14),

                          // Password field
                          _buildRoundedField(
                            controller: _passwordController,
                            hint: 'Senha',
                            icon: Icons.lock_outline,
                            obscureText: true,
                            validator: (v) {
                              if (v == null || v.isEmpty) return 'Senha é obrigatória';
                              return null;
                            },
                          ),
                          const SizedBox(height: 28),

                          // Login button
                          SizedBox(
                            height: 52,
                            child: ElevatedButton(
                              onPressed: _isLoading ? null : _handleLogin,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: const Color(0xFF6A0DAD),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(30),
                                ),
                                elevation: 0,
                              ),
                              child: _isLoading
                                  ? const SizedBox(
                                      height: 22,
                                      width: 22,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    )
                                  : const Text(
                                      'Entrar',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                            ),
                          ),
                          const SizedBox(height: 14),

                          // Divider
                          Row(
                            children: [
                              Expanded(child: Divider(color: Colors.white38, thickness: 1)),
                              const Padding(
                                padding: EdgeInsets.symmetric(horizontal: 12),
                                child: Text('ou', style: TextStyle(color: Colors.white70, fontSize: 13)),
                              ),
                              Expanded(child: Divider(color: Colors.white38, thickness: 1)),
                            ],
                          ),
                          const SizedBox(height: 14),

                          // Google Sign-In button
                          SizedBox(
                            height: 52,
                            child: OutlinedButton.icon(
                              onPressed: _isLoading ? null : _handleGoogleLogin,
                              icon: const Icon(Icons.g_mobiledata, size: 24, color: Colors.white),
                              label: const Text(
                                'Entrar com Google',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.white,
                                ),
                              ),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: Colors.white70, width: 1.5),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(30),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),

                          TextButton(
                            onPressed: () => context.push('/register'),
                            child: const Text(
                              'Não tem conta? Cadastre-se',
                              style: TextStyle(color: Colors.white70),
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Rede de Apoio (sem login)
                          TextButton.icon(
                            onPressed: () => context.push('/emergency-network'),
                            icon: const Icon(Icons.shield, size: 18, color: Colors.white),
                            label: const Text(
                              'Rede de Apoio (emergência)',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w500),
                            ),
                          ),

                          // Totems no mapa (sem login)
                          TextButton.icon(
                            onPressed: () => context.push('/totems'),
                            icon: const Icon(Icons.pin_drop, size: 18, color: Colors.white),
                            label: const Text(
                              'Totems de Apoio (mapa)',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w500),
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],
                      ),
                    ),
                  ),
                ),
                ),

                // Footer
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
                  child: Image.asset(
                    'assets/images/footer.png',
                    width: double.infinity,
                    height: 40,
                    fit: BoxFit.contain,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSlidingToggle() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final totalWidth = constraints.maxWidth;
        final pillWidth = totalWidth / 2;
        const height = 52.0;
        const padding = 4.0;

        return Container(
          height: height,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.12),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(
              color: Colors.white.withOpacity(0.6),
              width: 1.5,
            ),
          ),
          child: Stack(
            children: [
              // Pill deslizante
              AnimatedPositioned(
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeInOut,
                left: _useEmail ? padding : pillWidth + padding / 2,
                top: padding,
                bottom: padding,
                width: pillWidth - padding * 1.5,
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.12),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                ),
              ),
              // Labels por cima
              Positioned.fill(
                child: Row(
                  children: [
                    _buildToggleLabel(
                      label: 'Email',
                      icon: Icons.email_outlined,
                      selected: _useEmail,
                      onTap: () => _switchMode(true),
                    ),
                    _buildToggleLabel(
                      label: 'Telefone',
                      icon: Icons.phone_outlined,
                      selected: !_useEmail,
                      onTap: () => _switchMode(false),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildToggleLabel({
    required String label,
    required IconData icon,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: SizedBox.expand(
          child: AnimatedDefaultTextStyle(
            duration: const Duration(milliseconds: 300),
            style: TextStyle(
              color: selected ? const Color(0xFF6A0DAD) : Colors.white,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
              fontSize: 14,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Icon(
                  icon,
                  size: 16,
                  color: selected ? const Color(0xFF6A0DAD) : Colors.white,
                ),
                const SizedBox(width: 6),
                Text(label),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRoundedField({
    Key? key,
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
    bool obscureText = false,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      key: key,
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Colors.white70),
        prefixIcon: Icon(icon, color: Colors.white70, size: 20),
        filled: true,
        fillColor: Colors.white.withOpacity(0.12),
        contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(30),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(30),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.6), width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(30),
          borderSide: const BorderSide(color: Colors.white, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(30),
          borderSide: const BorderSide(color: Colors.orangeAccent, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(30),
          borderSide: const BorderSide(color: Colors.orangeAccent, width: 1),
        ),
        errorStyle: const TextStyle(color: Colors.orangeAccent),
      ),
      validator: validator,
    );
  }
}

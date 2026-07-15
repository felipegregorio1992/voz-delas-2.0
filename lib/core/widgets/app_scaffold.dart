import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Scaffold padrão do app com logo no AppBar e footer na base.
class AppScaffold extends StatelessWidget {
  final String title;
  final Widget body;
  final List<Widget>? actions;
  final Widget? floatingActionButton;
  final bool showLogo;
  final bool showBackButton;
  final VoidCallback? onBack;

  const AppScaffold({
    super.key,
    required this.title,
    required this.body,
    this.actions,
    this.floatingActionButton,
    this.showLogo = true,
    this.showBackButton = false,
    this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        centerTitle: true,
        toolbarHeight: 80,
        leading: showBackButton
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () {
                  if (onBack != null) {
                    onBack!();
                  } else {
                    // Tentar pop, se falhar, ir para home
                    if (context.canPop()) {
                      context.pop();
                    } else {
                      context.go('/home');
                    }
                  }
                },
              )
            : null,
        title: showLogo
            ? Image.asset(
                'assets/images/logo_sec_politica_defesa_direitos_mulheres_prefeitura_vertical_preto .png',
                height: 64,
                fit: BoxFit.contain,
              )
            : Text(title),
        actions: actions,
      ),
      floatingActionButton: floatingActionButton,
      body: Column(
        children: [
          Expanded(child: body),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 2),
              child: Image.asset(
                'assets/images/COOPTEC ASS 3COOPTEC_SIMBOL_ Editada_v3_Preto.png',
                width: double.infinity,
                height: 36,
                fit: BoxFit.contain,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

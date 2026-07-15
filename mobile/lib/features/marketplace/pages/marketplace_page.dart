import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/widgets/app_scaffold.dart';

enum SortOption {
  recent,
  oldest,
  priceAsc,
  priceDesc,
  rating,
}

extension SortOptionLabel on SortOption {
  String get label {
    switch (this) {
      case SortOption.recent:    return 'Mais recente';
      case SortOption.oldest:    return 'Mais antigo';
      case SortOption.priceAsc:  return 'Menor preço';
      case SortOption.priceDesc: return 'Maior preço';
      case SortOption.rating:    return 'Melhor avaliação';
    }
  }

  IconData get icon {
    switch (this) {
      case SortOption.recent:    return Icons.schedule;
      case SortOption.oldest:    return Icons.history;
      case SortOption.priceAsc:  return Icons.arrow_upward;
      case SortOption.priceDesc: return Icons.arrow_downward;
      case SortOption.rating:    return Icons.star;
    }
  }
}

class MarketplacePage extends ConsumerStatefulWidget {
  const MarketplacePage({super.key});

  @override
  ConsumerState<MarketplacePage> createState() => _MarketplacePageState();
}

class _MarketplacePageState extends ConsumerState<MarketplacePage> {
  bool _isLoading = true;
  List<dynamic> _stores = [];
  List<dynamic> _filtered = [];

  final _searchController = TextEditingController();
  SortOption _sortOption = SortOption.recent;

  // Filtros
  String _searchQuery = '';
  String? _selectedTheme; // temática
  bool _onlyWithProducts = false;

  @override
  void initState() {
    super.initState();
    _loadStores();
    _searchController.addListener(() {
      setState(() {
        _searchQuery = _searchController.text.trim().toLowerCase();
        _applyFilters();
      });
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadStores() async {
    setState(() => _isLoading = true);
    try {
      final dioClient = ref.read(dioClientProvider);
      final response = await dioClient.dio.get('/merchants/public');
      final data = response.data['data'] ?? response.data;
      _stores = List<dynamic>.from(data ?? []);
      _applyFilters();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao carregar lojas: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // Retorna o menor preço de produto de uma loja
  double _minPrice(dynamic store) {
    final products = List<dynamic>.from(store['products'] ?? []);
    if (products.isEmpty) return double.infinity;
    return products
        .map((p) => (p['price'] as num?)?.toDouble() ?? double.infinity)
        .reduce((a, b) => a < b ? a : b);
  }

  // Retorna o maior preço de produto de uma loja
  double _maxPrice(dynamic store) {
    final products = List<dynamic>.from(store['products'] ?? []);
    if (products.isEmpty) return 0.0;
    return products
        .map((p) => (p['price'] as num?)?.toDouble() ?? 0.0)
        .reduce((a, b) => a > b ? a : b);
  }

  double _avgRating(dynamic store) {
    final r = (store['averageRating'] as num?)?.toDouble();
    return r ?? 0.0;
  }

  void _applyFilters() {
    List<dynamic> result = List.from(_stores);

    // Busca por nome, produto ou temática
    if (_searchQuery.isNotEmpty) {
      result = result.where((s) {
        final name = (s['businessName'] ?? '').toString().toLowerCase();
        final theme = (s['category'] ?? s['theme'] ?? '').toString().toLowerCase();
        final products = List<dynamic>.from(s['products'] ?? []);
        final hasProduct = products.any(
          (p) => (p['name'] ?? '').toString().toLowerCase().contains(_searchQuery),
        );
        return name.contains(_searchQuery) ||
            theme.contains(_searchQuery) ||
            hasProduct;
      }).toList();
    }

    // Filtro por temática selecionada
    if (_selectedTheme != null && _selectedTheme!.isNotEmpty) {
      result = result.where((s) {
        final theme = (s['category'] ?? s['theme'] ?? '').toString();
        return theme == _selectedTheme;
      }).toList();
    }

    // Filtro: apenas com produtos
    if (_onlyWithProducts) {
      result = result.where((s) {
        final products = List<dynamic>.from(s['products'] ?? []);
        return products.isNotEmpty;
      }).toList();
    }

    // Ordenação
    switch (_sortOption) {
      case SortOption.recent:
        result.sort((a, b) {
          final da = DateTime.tryParse(a['createdAt'] ?? '') ?? DateTime(2000);
          final db = DateTime.tryParse(b['createdAt'] ?? '') ?? DateTime(2000);
          return db.compareTo(da);
        });
        break;
      case SortOption.oldest:
        result.sort((a, b) {
          final da = DateTime.tryParse(a['createdAt'] ?? '') ?? DateTime(2000);
          final db = DateTime.tryParse(b['createdAt'] ?? '') ?? DateTime(2000);
          return da.compareTo(db);
        });
        break;
      case SortOption.priceAsc:
        result.sort((a, b) => _minPrice(a).compareTo(_minPrice(b)));
        break;
      case SortOption.priceDesc:
        result.sort((a, b) => _maxPrice(b).compareTo(_maxPrice(a)));
        break;
      case SortOption.rating:
        result.sort((a, b) => _avgRating(b).compareTo(_avgRating(a)));
        break;
    }

    setState(() => _filtered = result);
  }

  // Coleta todas as temáticas únicas das lojas
  List<String> get _allThemes {
    final themes = _stores
        .map((s) => (s['category'] ?? s['theme'] ?? '').toString())
        .where((t) => t.isNotEmpty)
        .toSet()
        .toList();
    themes.sort();
    return themes;
  }

  void _showSortSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Text('Ordenar por', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
            ...SortOption.values.map((opt) => RadioListTile<SortOption>(
              value: opt,
              groupValue: _sortOption,
              title: Row(
                children: [
                  Icon(opt.icon, size: 18, color: Colors.purple),
                  const SizedBox(width: 8),
                  Text(opt.label),
                ],
              ),
              activeColor: Colors.purple,
              onChanged: (v) {
                setState(() {
                  _sortOption = v!;
                  _applyFilters();
                });
                Navigator.pop(context);
              },
            )),
          ],
        ),
      ),
    );
  }

  void _showFilterSheet() {
    String? tempTheme = _selectedTheme;
    bool tempOnlyProducts = _onlyWithProducts;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModal) => Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Filtros', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),

              // Temática
              if (_allThemes.isNotEmpty) ...[
                const Text('Temática', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: [
                    ChoiceChip(
                      label: const Text('Todas'),
                      selected: tempTheme == null,
                      selectedColor: Colors.purple.shade100,
                      onSelected: (_) => setModal(() => tempTheme = null),
                    ),
                    ..._allThemes.map((t) => ChoiceChip(
                      label: Text(t),
                      selected: tempTheme == t,
                      selectedColor: Colors.purple.shade100,
                      onSelected: (_) => setModal(() => tempTheme = t),
                    )),
                  ],
                ),
                const SizedBox(height: 16),
              ],

              // Apenas com produtos
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Apenas lojas com produtos'),
                value: tempOnlyProducts,
                activeColor: Colors.purple,
                onChanged: (v) => setModal(() => tempOnlyProducts = v),
              ),
              const SizedBox(height: 16),

              // Botões
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        setState(() {
                          _selectedTheme = null;
                          _onlyWithProducts = false;
                          _applyFilters();
                        });
                        Navigator.pop(ctx);
                      },
                      child: const Text('Limpar'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.purple, foregroundColor: Colors.white),
                      onPressed: () {
                        setState(() {
                          _selectedTheme = tempTheme;
                          _onlyWithProducts = tempOnlyProducts;
                          _applyFilters();
                        });
                        Navigator.pop(ctx);
                      },
                      child: const Text('Aplicar'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  bool get _hasActiveFilters => _selectedTheme != null || _onlyWithProducts;

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showBackButton: true,
      title: 'Lojas',
      body: Column(
        children: [
          // ── Barra de busca + botões ──────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Buscar por nome, produto ou temática...',
                      prefixIcon: const Icon(Icons.search, color: Colors.purple),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear),
                              onPressed: () {
                                _searchController.clear();
                              },
                            )
                          : null,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey.shade300),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey.shade300),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Colors.purple),
                      ),
                      filled: true,
                      fillColor: Colors.grey.shade50,
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // Filtros
                Stack(
                  children: [
                    IconButton(
                      onPressed: _showFilterSheet,
                      icon: const Icon(Icons.tune),
                      color: _hasActiveFilters ? Colors.purple : Colors.grey.shade600,
                      style: IconButton.styleFrom(
                        backgroundColor: _hasActiveFilters ? Colors.purple.shade50 : Colors.grey.shade100,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    if (_hasActiveFilters)
                      Positioned(
                        right: 6, top: 6,
                        child: Container(
                          width: 8, height: 8,
                          decoration: const BoxDecoration(color: Colors.purple, shape: BoxShape.circle),
                        ),
                      ),
                  ],
                ),
                const SizedBox(width: 4),
                // Ordenação
                IconButton(
                  onPressed: _showSortSheet,
                  icon: const Icon(Icons.sort),
                  color: Colors.grey.shade600,
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.grey.shade100,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ],
            ),
          ),

          // ── Chips de filtros ativos ──────────────────────────────────
          if (_hasActiveFilters || _sortOption != SortOption.recent)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    if (_sortOption != SortOption.recent)
                      Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: Chip(
                          label: Text(_sortOption.label, style: const TextStyle(fontSize: 12)),
                          avatar: Icon(_sortOption.icon, size: 14),
                          backgroundColor: Colors.purple.shade50,
                          deleteIcon: const Icon(Icons.close, size: 14),
                          onDeleted: () => setState(() {
                            _sortOption = SortOption.recent;
                            _applyFilters();
                          }),
                        ),
                      ),
                    if (_selectedTheme != null)
                      Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: Chip(
                          label: Text(_selectedTheme!, style: const TextStyle(fontSize: 12)),
                          backgroundColor: Colors.purple.shade50,
                          deleteIcon: const Icon(Icons.close, size: 14),
                          onDeleted: () => setState(() {
                            _selectedTheme = null;
                            _applyFilters();
                          }),
                        ),
                      ),
                    if (_onlyWithProducts)
                      Chip(
                        label: const Text('Com produtos', style: TextStyle(fontSize: 12)),
                        backgroundColor: Colors.purple.shade50,
                        deleteIcon: const Icon(Icons.close, size: 14),
                        onDeleted: () => setState(() {
                          _onlyWithProducts = false;
                          _applyFilters();
                        }),
                      ),
                  ],
                ),
              ),
            ),

          // ── Contador de resultados ───────────────────────────────────
          if (!_isLoading)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  '${_filtered.length} loja${_filtered.length != 1 ? 's' : ''} encontrada${_filtered.length != 1 ? 's' : ''}',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
              ),
            ),

          // ── Lista ────────────────────────────────────────────────────
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadStores,
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _filtered.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.store_outlined, size: 64, color: Colors.grey.shade400),
                              const SizedBox(height: 16),
                              Text(
                                _searchQuery.isNotEmpty || _hasActiveFilters
                                    ? 'Nenhuma loja encontrada'
                                    : 'Nenhuma loja disponível',
                                style: TextStyle(fontSize: 16, color: Colors.grey.shade600),
                              ),
                              if (_searchQuery.isNotEmpty || _hasActiveFilters) ...[
                                const SizedBox(height: 8),
                                TextButton(
                                  onPressed: () {
                                    _searchController.clear();
                                    setState(() {
                                      _selectedTheme = null;
                                      _onlyWithProducts = false;
                                      _sortOption = SortOption.recent;
                                      _applyFilters();
                                    });
                                  },
                                  child: const Text('Limpar filtros'),
                                ),
                              ],
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                          itemCount: _filtered.length,
                          itemBuilder: (context, index) {
                            final store = _filtered[index];
                            final products = List<dynamic>.from(store['products'] ?? []);
                            final rating = _avgRating(store);
                            final theme = (store['category'] ?? store['theme'] ?? '').toString();

                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              child: InkWell(
                                borderRadius: BorderRadius.circular(12),
                                onTap: () => context.push('/marketplace/store/${store['id']}'),
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          const Icon(Icons.store, size: 28, color: Colors.purple),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Text(
                                              store['businessName'] ?? 'Sem nome',
                                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                            ),
                                          ),
                                          const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
                                        ],
                                      ),
                                      if (store['description'] != null) ...[
                                        const SizedBox(height: 6),
                                        Text(
                                          store['description'],
                                          style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ],
                                      const SizedBox(height: 10),
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 4,
                                        children: [
                                          // Produtos
                                          _InfoChip(
                                            icon: Icons.inventory_2_outlined,
                                            label: '${products.length} produto${products.length != 1 ? 's' : ''}',
                                          ),
                                          // Cidade
                                          if (store['city'] != null)
                                            _InfoChip(
                                              icon: Icons.location_on_outlined,
                                              label: store['city'],
                                            ),
                                          // Temática
                                          if (theme.isNotEmpty)
                                            _InfoChip(
                                              icon: Icons.category_outlined,
                                              label: theme,
                                              color: Colors.purple.shade50,
                                            ),
                                          // Avaliação
                                          if (rating > 0)
                                            _InfoChip(
                                              icon: Icons.star,
                                              label: rating.toStringAsFixed(1),
                                              color: Colors.amber.shade50,
                                              iconColor: Colors.amber,
                                            ),
                                          // Menor preço
                                          if (products.isNotEmpty) ...[
                                            _InfoChip(
                                              icon: Icons.attach_money,
                                              label: 'A partir de R\$ ${_minPrice(store).toStringAsFixed(2)}',
                                              color: Colors.green.shade50,
                                              iconColor: Colors.green,
                                            ),
                                          ],
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? color;
  final Color? iconColor;

  const _InfoChip({
    required this.icon,
    required this.label,
    this.color,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color ?? Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: iconColor ?? Colors.grey.shade600),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
        ],
      ),
    );
  }
}

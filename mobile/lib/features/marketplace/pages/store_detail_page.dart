import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/widgets/app_scaffold.dart';

class StoreDetailPage extends ConsumerStatefulWidget {
  final String storeId;
  
  const StoreDetailPage({super.key, required this.storeId});

  @override
  ConsumerState<StoreDetailPage> createState() => _StoreDetailPageState();
}

class _StoreDetailPageState extends ConsumerState<StoreDetailPage> {
  bool _isLoading = true;
  Map<String, dynamic>? _store;
  List<dynamic> _products = [];

  @override
  void initState() {
    super.initState();
    _loadStore();
  }

  Future<void> _loadStore() async {
    setState(() => _isLoading = true);

    try {
      final dioClient = ref.read(dioClientProvider);
      final response = await dioClient.dio.get('/merchants/public/${widget.storeId}');
      
      final data = response.data['data'] ?? response.data;
      if (data != null) {
        setState(() {
          _store = Map<String, dynamic>.from(data);
          _products = List<dynamic>.from(data['products'] ?? []);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao carregar loja: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
        context.pop();
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return AppScaffold(
      title: 'Loja',
      body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_store == null) {
      return AppScaffold(
      title: 'Loja',
      body: const Center(child: Text('Loja não encontrada')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_store!['businessName'] ?? 'Loja'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Informações da Loja
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.store, size: 32, color: Colors.purple),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            _store!['businessName'] ?? 'Sem nome',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (_store!['description'] != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _store!['description'],
                        style: const TextStyle(color: Colors.grey),
                      ),
                    ],
                    if (_store!['phone'] != null || _store!['email'] != null || _store!['address'] != null) ...[
                      const SizedBox(height: 12),
                      const Divider(),
                      if (_store!['phone'] != null)
                        _buildInfoRow(Icons.phone, _store!['phone']),
                      if (_store!['email'] != null)
                        _buildInfoRow(Icons.email, _store!['email']),
                      if (_store!['address'] != null)
                        _buildInfoRow(Icons.location_on, _store!['address']),
                      if (_store!['city'] != null)
                        _buildInfoRow(Icons.location_city, _store!['city']),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            // Produtos
            Text(
              'Produtos (${_products.length})',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            if (_products.isEmpty)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(32.0),
                  child: Center(
                    child: Text(
                      'Esta loja ainda não tem produtos',
                      style: TextStyle(color: Colors.grey),
                    ),
                  ),
                ),
              )
            else
              ..._products.map((product) => _buildProductCard(product)),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductCard(Map<String, dynamic> product) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Row(
          children: [
            product['imageUrl'] != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      product['imageUrl'],
                      width: 80,
                      height: 80,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) =>
                          const Icon(Icons.image, size: 80),
                    ),
                  )
                : const Icon(Icons.image, size: 80),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product['name'] ?? 'Sem nome',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (product['description'] != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      product['description'],
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                  const SizedBox(height: 8),
                  Text(
                    'R\$ ${(product['price'] ?? 0).toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.green,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}



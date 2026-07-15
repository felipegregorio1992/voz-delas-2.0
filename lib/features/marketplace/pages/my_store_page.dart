import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/widgets/app_scaffold.dart';

class MyStorePage extends ConsumerStatefulWidget {
  const MyStorePage({super.key});

  @override
  ConsumerState<MyStorePage> createState() => _MyStorePageState();
}

class _MyStorePageState extends ConsumerState<MyStorePage> {
  bool _isLoading = true;
  bool _hasStore = false;
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
      final response = await dioClient.dio.get('/merchants/me');
      
      final data = response.data['data'] ?? response.data;
      if (data != null && data is Map) {
        setState(() {
          _hasStore = true;
          _store = Map<String, dynamic>.from(data);
          _products = List<dynamic>.from(data['products'] ?? []);
        });
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        setState(() {
          _hasStore = false;
          _store = null;
          _products = [];
        });
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Erro ao carregar loja: ${e.message}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      setState(() {
        _hasStore = false;
        _store = null;
        _products = [];
      });
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
      title: 'Minha Loja',
      body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (!_hasStore) {
      return AppScaffold(
      title: 'Minha Loja',
      body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.store_outlined,
                  size: 80,
                  color: Colors.grey,
                ),
                const SizedBox(height: 24),
                const Text(
                  'Você ainda não possui uma loja',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                const Text(
                  'Solicite ser empreendedora para criar sua loja',
                  style: TextStyle(color: Colors.grey),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: () => context.push('/marketplace/request'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  ),
                  child: const Text('Solicitar ser Empreendedora'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Minha Loja'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () => context.push('/marketplace/my-store/edit'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadStore,
        child: SingleChildScrollView(
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
                      if (_store!['phone'] != null || _store!['email'] != null) ...[
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Meus Produtos',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () => context.push('/marketplace/products/new'),
                    icon: const Icon(Icons.add),
                    label: const Text('Adicionar'),
                  ),
                ],
              ),
              if (_products.isEmpty)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(32.0),
                    child: Column(
                      children: [
                        const Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey),
                        const SizedBox(height: 16),
                        const Text(
                          'Nenhum produto cadastrado',
                          style: TextStyle(color: Colors.grey),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => context.push('/marketplace/products/new'),
                          child: const Text('Cadastrar Primeiro Produto'),
                        ),
                      ],
                    ),
                  ),
                )
              else
                ..._products.map((product) => _buildProductCard(product)),
            ],
          ),
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
      child: ListTile(
        leading: product['imageUrl'] != null
            ? ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(
                  product['imageUrl'],
                  width: 60,
                  height: 60,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) =>
                      const Icon(Icons.image, size: 60),
                ),
              )
            : const Icon(Icons.image, size: 60),
        title: Text(
          product['name'] ?? 'Sem nome',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (product['description'] != null)
              Text(
                product['description'],
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            const SizedBox(height: 4),
            Text(
              'R\$ ${(product['price'] ?? 0).toStringAsFixed(2)}',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.green,
              ),
            ),
            if (product['stock'] != null)
              Text(
                'Estoque: ${product['stock']}',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
          ],
        ),
        trailing: PopupMenuButton(
          itemBuilder: (context) => [
            const PopupMenuItem(
              value: 'edit',
              child: Row(
                children: [
                  Icon(Icons.edit, size: 20),
                  SizedBox(width: 8),
                  Text('Editar'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'delete',
              child: Row(
                children: [
                  Icon(Icons.delete, size: 20, color: Colors.red),
                  SizedBox(width: 8),
                  Text('Excluir', style: TextStyle(color: Colors.red)),
                ],
              ),
            ),
          ],
          onSelected: (value) {
            if (value == 'edit') {
              context.push('/marketplace/products/${product['id']}/edit');
            } else if (value == 'delete') {
              _deleteProduct(product['id']);
            }
          },
        ),
      ),
    );
  }

  Future<void> _deleteProduct(String productId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmar Exclusão'),
        content: const Text('Tem certeza que deseja excluir este produto?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Excluir'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final dioClient = ref.read(dioClientProvider);
      await dioClient.dio.delete('/products/$productId');
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Produto excluído com sucesso'),
            backgroundColor: Colors.green,
          ),
        );
        _loadStore();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao excluir produto: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}



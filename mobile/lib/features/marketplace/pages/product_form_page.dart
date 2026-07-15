import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/widgets/app_scaffold.dart';

class ProductFormPage extends ConsumerStatefulWidget {
  final String? productId;
  
  const ProductFormPage({super.key, this.productId});

  @override
  ConsumerState<ProductFormPage> createState() => _ProductFormPageState();
}

class _ProductFormPageState extends ConsumerState<ProductFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _priceController = TextEditingController();
  final _imageUrlController = TextEditingController();
  final _categoryController = TextEditingController();
  final _stockController = TextEditingController();
  
  bool _isLoading = false;
  bool _isLoadingData = false;

  @override
  void initState() {
    super.initState();
    if (widget.productId != null) {
      _loadProduct();
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    _imageUrlController.dispose();
    _categoryController.dispose();
    _stockController.dispose();
    super.dispose();
  }

  Future<void> _loadProduct() async {
    setState(() => _isLoadingData = true);
    
    try {
      final dioClient = ref.read(dioClientProvider);
      final response = await dioClient.dio.get('/products/me');
      
      final products = response.data['data'] ?? response.data;
      if (products is List) {
        final product = products.firstWhere(
          (p) => p['id'] == widget.productId,
          orElse: () => null,
        );
        
        if (product != null) {
          _nameController.text = product['name'] ?? '';
          _descriptionController.text = product['description'] ?? '';
          _priceController.text = (product['price'] ?? 0).toString();
          _imageUrlController.text = product['imageUrl'] ?? '';
          _categoryController.text = product['category'] ?? '';
          _stockController.text = (product['stock'] ?? 0).toString();
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao carregar produto: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoadingData = false);
      }
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isLoading = true);

    try {
      final dioClient = ref.read(dioClientProvider);
      final price = double.tryParse(_priceController.text) ?? 0.0;
      final stock = int.tryParse(_stockController.text) ?? 0;

      if (widget.productId != null) {
        // Editar produto existente
        await dioClient.dio.patch(
          '/products/${widget.productId}',
          data: {
            'name': _nameController.text.trim(),
            'description': _descriptionController.text.trim().isEmpty 
                ? null 
                : _descriptionController.text.trim(),
            'price': price,
            'imageUrl': _imageUrlController.text.trim().isEmpty 
                ? null 
                : _imageUrlController.text.trim(),
            'category': _categoryController.text.trim().isEmpty 
                ? null 
                : _categoryController.text.trim(),
            'stock': stock,
          },
        );
      } else {
        // Criar novo produto
        await dioClient.dio.post(
          '/products',
          data: {
            'name': _nameController.text.trim(),
            'description': _descriptionController.text.trim().isEmpty 
                ? null 
                : _descriptionController.text.trim(),
            'price': price,
            'imageUrl': _imageUrlController.text.trim().isEmpty 
                ? null 
                : _imageUrlController.text.trim(),
            'category': _categoryController.text.trim().isEmpty 
                ? null 
                : _categoryController.text.trim(),
            'stock': stock,
          },
        );
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.productId != null 
                ? 'Produto atualizado com sucesso!'
                : 'Produto cadastrado com sucesso!'),
            backgroundColor: Colors.green,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao ${widget.productId != null ? 'atualizar' : 'cadastrar'} produto: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoadingData) {
      return Scaffold(
        appBar: AppBar(
          title: Text(widget.productId != null ? 'Editar Produto' : 'Novo Produto'),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.productId != null ? 'Editar Produto' : 'Novo Produto'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Nome do Produto *',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.shopping_bag),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Nome do produto é obrigatório';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _descriptionController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Descrição (opcional)',
                  border: OutlineInputBorder(),
                  hintText: 'Descreva o produto...',
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _priceController,
                decoration: const InputDecoration(
                  labelText: 'Preço *',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.attach_money),
                  prefixText: 'R\$ ',
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Preço é obrigatório';
                  }
                  final price = double.tryParse(value);
                  if (price == null || price < 0) {
                    return 'Preço inválido';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _stockController,
                decoration: const InputDecoration(
                  labelText: 'Estoque',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.inventory),
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value != null && value.trim().isNotEmpty) {
                    final stock = int.tryParse(value);
                    if (stock == null || stock < 0) {
                      return 'Estoque inválido';
                    }
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _categoryController,
                decoration: const InputDecoration(
                  labelText: 'Categoria (opcional)',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.category),
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _imageUrlController,
                decoration: const InputDecoration(
                  labelText: 'URL da Imagem (opcional)',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.image),
                ),
                keyboardType: TextInputType.url,
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isLoading ? null : _handleSubmit,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isLoading
                    ? const CircularProgressIndicator()
                    : Text(
                        widget.productId != null ? 'Salvar Alterações' : 'Cadastrar Produto',
                        style: const TextStyle(fontSize: 16),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}



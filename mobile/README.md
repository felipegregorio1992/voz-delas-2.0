# Voz Delas - Mobile (Flutter)

Aplicativo mobile desenvolvido com Flutter para o sistema Voz Delas.

## 🚀 Início Rápido

### Pré-requisitos

- Flutter 3.0+
- Dart 3.0+
- Android Studio / Xcode (para emuladores)
- Backend rodando (veja `../backend/README.md`)

### Instalação

1. **Instale as dependências:**
```bash
flutter pub get
```

2. **Configure a URL da API:**
Edite `lib/core/config/api_config.dart` e ajuste a `baseUrl`:
- **Android Emulator:** `http://10.0.2.2:3000/api/v1`
- **iOS Simulator:** `http://localhost:3000/api/v1`
- **Dispositivo físico:** `http://<IP_DA_SUA_MAQUINA>:3000/api/v1`

3. **Execute o app:**
```bash
flutter run
```

## 📱 Funcionalidades

### Autenticação
- Login com email ou telefone
- Cadastro de usuário
- Logout

### Home
- Botão do Pânico (destaque)
- Registrar Denúncia
- Acesso a Contatos de Confiança
- Acesso à Rede de Apoio

### Denúncias
- Formulário de registro
- Envio automático de localização por 60 segundos após criar

### Botão do Pânico
- Acionamento de emergência
- Rastreamento de localização a cada 5 segundos
- Encerramento manual

### Contatos de Confiança
- Listar contatos (máx. 3)
- Adicionar novo contato
- Remover contato

### Rede de Apoio
- Listar serviços (CEAMs, DEAMs, etc.)
- Visualizar informações de contato
- Ligar diretamente (se disponível)

## 🔧 Configuração

### Permissões

O app solicita as seguintes permissões:

- **Localização:** Para rastreamento em denúncias e pânico
- **Telefone:** Para fazer ligações para serviços de apoio

### Variáveis de Ambiente

Edite `lib/core/config/api_config.dart`:

```dart
static const String baseUrl = 'http://seu-ip:3000/api/v1';
```

## 🧪 Testes

```bash
# Executar testes
flutter test

# Analisar código
flutter analyze

# Formatar código
flutter format .
```

## 📦 Estrutura do Projeto

```
mobile/
├── lib/
│   ├── main.dart              # Entry point
│   ├── app.dart               # Configuração do app e rotas
│   ├── core/
│   │   ├── config/           # Configurações (API, etc.)
│   │   ├── network/          # Cliente HTTP (Dio)
│   │   ├── storage/          # Armazenamento seguro
│   │   └── utils/            # Utilitários (geolocalização)
│   └── features/
│       ├── auth/             # Autenticação
│       ├── home/             # Tela inicial
│       ├── incidents/        # Denúncias
│       ├── panic/            # Botão do pânico
│       ├── trusted_contacts/ # Contatos de confiança
│       └── support_network/  # Rede de apoio
└── pubspec.yaml
```

## 🔐 Segurança

- Tokens JWT armazenados em `flutter_secure_storage`
- Refresh automático de tokens quando expiram
- Validação de entrada em formulários
- HTTPS recomendado em produção

## 📱 Build

### Android

```bash
flutter build apk --release
```

### iOS

```bash
flutter build ios --release
```

## 🐛 Troubleshooting

### Erro de conexão com API

1. Verifique se o backend está rodando
2. Verifique a URL em `api_config.dart`
3. Para dispositivo físico, use o IP da sua máquina na rede local
4. Verifique firewall/antivírus

### Erro de permissão de localização

1. Vá em Configurações do dispositivo
2. Permissões > Voz Delas
3. Ative a permissão de localização

## 📄 Licença

Este projeto é privado e confidencial.


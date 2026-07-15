# Voz Delas - Backend

API REST desenvolvida com NestJS, TypeScript, Prisma e MySQL.

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 18+
- Docker e Docker Compose
- MySQL (via Docker)

### Instalação

1. **Instale as dependências** (o `prisma generate` roda automaticamente via `postinstall`):
```bash
npm install
```

2. **Configure as variáveis de ambiente:**
```bash
cp .env.example .env
# Edite .env com suas configurações
```

3. **Suba o MySQL via Docker:**
```bash
docker compose up -d mysql adminer
```

4. **Execute as migrações:**
```bash
npx prisma migrate dev --name init
```

5. **Popule o banco com dados iniciais:**
```bash
npx prisma db seed
```

6. **Inicie o servidor:**
```bash
npm run start:dev
```

A API estará disponível em:
- **API:** http://localhost:3000
- **Swagger:** http://localhost:3000/docs
- **Adminer:** http://localhost:8080

### Credenciais do Banco (Docker)

- **Host:** localhost
- **Porta:** 3306
- **Database:** vozdelas
- **User:** root
- **Password:** root

## 📋 Usuários de Teste

Após executar o seed:

- **Admin:**
  - Email: `admin@vozdelas.com`
  - Senha: `admin123`

- **Usuário:**
  - Email: `user@vozdelas.com`
  - Senha: `user123`

## 🔐 Autenticação

A API usa JWT (JSON Web Tokens) para autenticação.

1. **Registre um usuário:**
```bash
POST /api/v1/auth/register
{
  "name": "Maria Silva",
  "email": "maria@example.com",
  "phone": "+5511999999999",
  "password": "senha123"
}
```

2. **Faça login:**
```bash
POST /api/v1/auth/login
{
  "email": "maria@example.com",
  "password": "senha123"
}
```

3. **Use o token nas requisições:**
```bash
Authorization: Bearer <access_token>
```

## 📚 Endpoints Principais

### Autenticação
- `POST /api/v1/auth/register` - Registrar usuário
- `POST /api/v1/auth/login` - Fazer login
- `POST /api/v1/auth/refresh` - Renovar token
- `POST /api/v1/auth/logout` - Fazer logout

### Usuário
- `GET /api/v1/me` - Obter dados do usuário
- `PATCH /api/v1/me` - Atualizar dados

### Contatos de Confiança
- `GET /api/v1/me/trusted-contacts` - Listar contatos
- `POST /api/v1/me/trusted-contacts` - Criar contato (máx. 3)
- `PATCH /api/v1/me/trusted-contacts/:id` - Atualizar contato
- `DELETE /api/v1/me/trusted-contacts/:id` - Remover contato

### Denúncias
- `POST /api/v1/incidents` - Criar denúncia
- `GET /api/v1/incidents/:id` - Obter denúncia
- `POST /api/v1/incidents/:id/locations` - Adicionar localização

### Pânico
- `POST /api/v1/panic` - Acionar botão do pânico
- `POST /api/v1/panic/:id/locations` - Adicionar localização
- `POST /api/v1/panic/:id/end` - Encerrar pânico

### Rede de Apoio
- `GET /api/v1/support-services` - Listar serviços (CEAMs, DEAMs, etc.)

### Uploads
- `POST /api/v1/uploads` - Upload de arquivo

### Admin
- `GET /api/v1/admin/incidents` - Listar todas as denúncias (ADMIN/OPERATOR)

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Executar com cobertura
npm run test:cov

# Executar em modo watch
npm run test:watch
```

## 🛠️ Scripts Disponíveis

- `npm run build` - Compilar o projeto
- `npm run start` - Iniciar em produção
- `npm run start:dev` - Iniciar em desenvolvimento (watch mode)
- `npm run start:debug` - Iniciar em modo debug
- `npm run lint` - Executar linter
- `npm run format` - Formatar código
- `npm run prisma:generate` - Gerar Prisma Client
- `npm run prisma:migrate` - Executar migrações
- `npm run prisma:studio` - Abrir Prisma Studio

## 🔒 Segurança

- **Autenticação JWT** com refresh tokens
- **RBAC** (Role-Based Access Control)
- **Rate Limiting** em endpoints críticos (login, pânico)
- **Validação de entrada** com class-validator
- **CORS** configurável
- **Helmet** para headers de segurança
- **Auditoria completa** (AuditLog)
- **Logs estruturados** com requestId

## 📊 Banco de Dados

### Prisma Studio

Visualize e edite dados diretamente:

```bash
npm run prisma:studio
```

### Migrations

```bash
# Criar nova migration
npx prisma migrate dev --name nome_da_migration

# Aplicar migrations em produção
npx prisma migrate deploy
```

## 🐳 Docker

### Subir todos os serviços

```bash
docker compose up -d
```

### Parar serviços

```bash
docker compose down
```

### Ver logs

```bash
docker compose logs -f backend
```

## 📝 Estrutura do Projeto

```
backend/
├── prisma/
│   ├── schema.prisma      # Schema do banco
│   └── seed.ts            # Dados iniciais
├── src/
│   ├── common/            # Utilitários compartilhados
│   │   ├── config/        # Configurações
│   │   ├── decorators/    # Decorators customizados
│   │   ├── filters/       # Exception filters
│   │   ├── guards/        # Guards de autenticação/autorização
│   │   ├── interceptors/  # Interceptors
│   │   └── prisma/        # Prisma service
│   └── modules/           # Módulos da aplicação
│       ├── auth/
│       ├── users/
│       ├── incidents/
│       ├── panic/
│       └── ...
└── test/                  # Testes
```

## 🔄 Integrações (MVP - Stubs)

As integrações com órgãos externos estão implementadas como stubs:

- **TJRJ** - Tribunal de Justiça do Rio de Janeiro
- **DEAM** - Delegacia Especializada de Atendimento à Mulher
- **GMAP** - Gerência de Monitoramento e Apoio
- **DEFENSORIA** - Defensoria Pública
- **SEI_DETRAN** - Sistema Eletrônico de Informações

Teste via: `POST /api/v1/integrations/:provider/test`

## 📄 Licença

Este projeto é privado e confidencial.


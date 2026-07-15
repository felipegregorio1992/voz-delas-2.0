# Voz Delas - Dashboard Web

Dashboard web para monitoramento em tempo real de denúncias, eventos de pânico e localizações.

## 🚀 Funcionalidades

- ✅ Autenticação com JWT
- ✅ Monitoramento de eventos de pânico em tempo real
- ✅ Visualização de denúncias
- ✅ Mapa interativo com localizações
- ✅ Atualização automática a cada 10 segundos
- ✅ Estatísticas em tempo real

## 📋 Pré-requisitos

- Node.js 18+ e npm
- Backend rodando em `http://localhost:3000`

## 🔧 Instalação

```bash
cd web
npm install
```

## 🏃 Executar

⚠️ **IMPORTANTE:** O backend deve estar rodando primeiro!

1. **Inicie o backend:**
   ```bash
   cd backend
   npm run start:dev
   ```
   O backend deve estar em `http://localhost:3000`

2. **Inicie o dashboard:**
   ```bash
   cd web
   npm run dev
   ```

3. **Acesse:**
   - Dashboard: http://localhost:5173
   - Backend API: http://localhost:3000
   - Swagger: http://localhost:3000/docs

## ❌ Erro de Conexão?

Se aparecer erro `ECONNREFUSED` ou "Backend não está rodando":

1. Verifique se o backend está rodando na porta 3000
2. Acesse http://localhost:3000/health para testar
3. Veja [TROUBLESHOOTING.md](TROUBLESHOOTING.md) para mais detalhes

## 🔐 Credenciais

Use as credenciais do admin:

- **Email:** `admin@vozdelas.com`
- **Senha:** `admin123`

## 📦 Build para Produção

```bash
npm run build
```

Os arquivos estarão em `dist/`

## 🗺️ Estrutura

```
web/
├── src/
│   ├── components/      # Componentes React
│   │   ├── MapView.tsx          # Mapa com localizações
│   │   ├── IncidentsList.tsx    # Lista de denúncias
│   │   └── PanicEventsList.tsx  # Lista de eventos de pânico
│   ├── contexts/        # Contextos React
│   │   └── AuthContext.tsx      # Autenticação
│   ├── pages/           # Páginas
│   │   ├── LoginPage.tsx        # Login
│   │   └── DashboardPage.tsx    # Dashboard principal
│   ├── services/        # Serviços
│   │   └── api.ts               # Cliente HTTP (axios)
│   ├── App.tsx          # Componente raiz
│   └── main.tsx         # Entry point
├── package.json
├── vite.config.ts       # Configuração Vite
└── tsconfig.json        # Configuração TypeScript
```

## 🔄 Atualização em Tempo Real

O dashboard atualiza automaticamente a cada 10 segundos para mostrar novos eventos e localizações.

## 🎨 Tecnologias

- **React 18** - Framework UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool
- **React Router** - Roteamento
- **Leaflet** - Mapas interativos
- **Axios** - Cliente HTTP
- **React Hot Toast** - Notificações
- **date-fns** - Formatação de datas

## 📱 Responsivo

O dashboard é responsivo e funciona bem em desktop e tablets.


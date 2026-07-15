# Troubleshooting - Dashboard Web

## Erro: ECONNREFUSED / Backend não está rodando

### Sintomas
- Erro ao fazer login: `ECONNREFUSED` ou `ERR_NETWORK`
- Mensagem: "Backend não está rodando"

### Solução

1. **Verifique se o backend está rodando:**
   ```bash
   # Em um terminal, execute:
   cd backend
   npm run start:dev
   ```

2. **Verifique se o backend está na porta 3000:**
   - Acesse: http://localhost:3000/health
   - Deve retornar: `{"status":"ok",...}`

3. **Se o backend não iniciar, verifique:**
   - MySQL está rodando? (`docker compose up -d` no diretório backend)
   - Variáveis de ambiente configuradas? (arquivo `.env`)
   - Dependências instaladas? (`npm install`)

### Ordem de inicialização

1. **Backend primeiro:**
   ```bash
   cd backend
   docker compose up -d    # MySQL + Adminer
   npm install
   npx prisma migrate dev
   npx prisma db seed
   npm run start:dev      # Backend na porta 3000
   ```

2. **Depois o dashboard:**
   ```bash
   cd web
   npm install
   npm run dev            # Dashboard na porta 5173
   ```

### Verificar conexão

Teste se o backend está acessível:
```bash
# PowerShell
Test-NetConnection -ComputerName localhost -Port 3000

# Ou acesse no navegador:
http://localhost:3000/health
http://localhost:3000/docs
```

### Configuração do Proxy

O Vite está configurado para fazer proxy de `/api` para `http://localhost:3000`.

Se o backend estiver em outra porta, edite `web/vite.config.ts`:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3000', // Altere se necessário
    changeOrigin: true,
  },
}
```


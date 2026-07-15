# 🐛 Debug do Dashboard

## Como verificar se o dashboard está recebendo dados

### 1. Abra o Console do Navegador (F12)

Você deve ver logs como:
```
🔄 Carregando dados do dashboard...
🔑 Token adicionado à requisição: /admin/incidents
🔑 Token adicionado à requisição: /admin/panic
🔑 Token adicionado à requisição: /admin/panic/active
✅ Resposta recebida: /admin/incidents 200
✅ Resposta recebida: /admin/panic 200
✅ Resposta recebida: /admin/panic/active 200
📊 Resposta de incidents: { data: [...] }
📊 Resposta de panic: { data: [...] }
📊 Resposta de panic/active: { data: [...] }
✅ Incidents: X
✅ Panic Events: Y
✅ Active Panic Events: Z
```

### 2. Verifique Erros Comuns

#### ❌ Erro 401 (Unauthorized)
```
❌ Erro na requisição: /admin/incidents
❌ Status: 401
⚠️ Não autenticado. Redirecionando para login...
```
**Solução:** Faça login novamente

#### ❌ Erro 403 (Forbidden)
```
❌ Erro na requisição: /admin/incidents
❌ Status: 403
⚠️ Acesso negado. Verifique suas permissões.
```
**Solução:** Verifique se o usuário tem role ADMIN, OPERATOR ou SECURITY

#### ❌ Erro 404 (Not Found)
```
❌ Erro na requisição: /admin/incidents
❌ Status: 404
⚠️ Endpoint não encontrado. Verifique se o backend está rodando.
```
**Solução:** Verifique se o backend está rodando em http://localhost:3000

#### ❌ Erro de Conexão
```
❌ Backend não está acessível
❌ Erro na requisição: /admin/incidents
❌ Status: undefined
```
**Solução:** 
1. Verifique se o backend está rodando: `cd backend && npm run start:dev`
2. Verifique se a porta 3000 está livre
3. Verifique se há firewall bloqueando

### 3. Verifique a Resposta do Backend

No console, você deve ver:
```javascript
📊 Resposta de incidents: { data: [...] }
```

Se `data` estiver vazio `[]`, significa que não há incidentes no banco.

### 4. Teste os Endpoints Diretamente

Abra no navegador ou Postman:
- http://localhost:3000/api/v1/admin/incidents
- http://localhost:3000/api/v1/admin/panic
- http://localhost:3000/api/v1/admin/panic/active

**Importante:** Você precisa estar autenticado! Use o token do localStorage ou faça login pelo Swagger.

### 5. Verifique o Token

No console do navegador, execute:
```javascript
localStorage.getItem('accessToken')
```

Se retornar `null`, você precisa fazer login.

### 6. Verifique CORS

Se houver erro de CORS, você verá:
```
Access to XMLHttpRequest at 'http://localhost:3000/api/v1/admin/incidents' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Solução:** O backend já está configurado para aceitar localhost:5173. Se ainda houver erro, verifique se o backend está rodando em modo development.

### 7. Verifique o Formato dos Dados

O ResponseInterceptor do backend envolve os dados em:
```json
{
  "data": [...]
}
```

O dashboard espera `response.data.data` ou `response.data` diretamente (se já vier como array).

## Checklist de Verificação

- [ ] Backend está rodando em http://localhost:3000
- [ ] Dashboard está rodando em http://localhost:5173
- [ ] Você está autenticado (token no localStorage)
- [ ] O usuário tem role ADMIN, OPERATOR ou SECURITY
- [ ] Não há erros no console do navegador
- [ ] As requisições estão sendo feitas (ver Network tab)
- [ ] As respostas têm status 200
- [ ] Os dados estão no formato correto

## Comandos Úteis

### Verificar se o backend está rodando
```bash
curl http://localhost:3000/api/v1/health
```

### Testar endpoint com token
```bash
# Pegue o token do localStorage do navegador
TOKEN="seu_token_aqui"
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/admin/panic/active
```

### Criar dados de teste
```bash
cd backend
npm run test:panic
```


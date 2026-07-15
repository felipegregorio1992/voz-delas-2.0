# Estágio 1: Build da aplicação
FROM node:18-alpine AS builder

# Instalar dependências do sistema necessárias para compilar módulos nativos (bcrypt)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar TODAS as dependências (incluindo devDependencies para build)
RUN npm ci && npm cache clean --force

# Gerar Prisma Client
RUN npx prisma generate

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Estágio 2: Imagem de produção
FROM node:18-alpine

# Instalar dependências do sistema necessárias para compilar módulos nativos (bcrypt)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar package.json para instalar apenas dependências de produção
COPY package*.json ./

# Instalar APENAS dependências de produção (bcrypt será compilado aqui)
RUN npm ci --only=production && npm cache clean --force

# Copiar arquivos do builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Remover ferramentas de build após compilação (reduz tamanho da imagem)
RUN apk del python3 make g++

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["npm", "run", "start:prod"]


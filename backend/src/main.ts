import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import * as path from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const isProduction = process.env.NODE_ENV === 'production';

  // ─── Cookie parser (necessário para ler cookies HttpOnly) ───────────────────
  app.use(cookieParser());

  // ─── Helmet + CSP sem unsafe-inline/unsafe-eval ─────────────────────────────
  // FIX #3: Removidos 'unsafe-inline' e 'unsafe-eval' do scriptSrc
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Sem unsafe-inline nem unsafe-eval — use nonces/hashes no frontend se necessário
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://*.googleapis.com"],
        // Apenas WSS em produção; ws: permitido apenas em dev
        connectSrc: isProduction
          ? ["'self'", "wss:", "https://fonts.googleapis.com", "https://fonts.gstatic.com"]
          : ["'self'", "ws:", "wss:", "http://localhost:*", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    // Forçar HTTPS em produção
    hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  }));

  // ─── CORS ────────────────────────────────────────────────────────────────────
  // FIX #13: Em dev, apenas origens explicitamente listadas (não qualquer IP local)
  const corsOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://127.0.0.1:5173',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Permite requisições sem origem (mobile apps nativos)
      if (!origin) {
        return callback(null, true);
      }
      // Alguns ambientes (WebViews / file://) enviam Origin: "null"
      if (origin === 'null') {
        return callback(null, true);
      }
      if (!isProduction) {
        return callback(null, true);
      }
      if (corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ─── Global prefix ───────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1', {
    exclude: ['/', '/health', '/api/v1/health'],
  });

  // ─── Servir arquivos estáticos (uploads) ────────────────────────────────────
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // ─── Global pipes ────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ─── Global filters ──────────────────────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ─── Global interceptors ─────────────────────────────────────────────────────
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(),
  );

  // ─── Swagger: apenas em desenvolvimento ─────────────────────────────────────
  // FIX #4: Swagger desabilitado em produção
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Voz Delas API')
      .setDescription('API para sistema de proteção e denúncia')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('accessToken')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    console.log(`📚 Swagger disponível em http://localhost:${process.env.PORT || 3000}/docs`);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Servidor rodando em http://localhost:${port} [${process.env.NODE_ENV || 'development'}]`);
}

bootstrap();


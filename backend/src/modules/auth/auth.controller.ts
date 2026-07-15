import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// Configuração dos cookies de autenticação
const isProduction = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS_ACCESS = {
  httpOnly: true,
  secure: isProduction,           // false em dev — localhost não é HTTPS
  sameSite: isProduction ? ('strict' as const) : ('lax' as const), // lax em dev para funcionar com proxy
  maxAge: 15 * 60 * 1000,         // 15 minutos
};

const COOKIE_OPTIONS_REFRESH = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ('strict' as const) : ('lax' as const),
  path: '/api/v1/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // FIX #6: Rate limit no registro (3 por minuto) para evitar criação em massa de contas
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Registrar novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Email ou telefone já cadastrado' })
  async register(
    @Body() dto: RegisterDto,
    @Request() request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto, request);

    // Setar cookies HttpOnly para o web dashboard
    res.cookie('accessToken', result.accessToken, COOKIE_OPTIONS_ACCESS);
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS_REFRESH);

    // Retornar tokens no body também para compatibilidade com o mobile
    return {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Fazer login' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(
    @Body() dto: LoginDto,
    @Request() request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Detectar plataforma pelo header X-Platform (enviado pelo mobile) ou
    // pela presença de cookies (indica browser/web)
    const platformHeader = request.headers['x-platform'];
    const platform: 'web' | 'app' = platformHeader === 'mobile' ? 'app' : 'web';

    const result = await this.authService.login(dto, request, platform);

    // Setar cookies HttpOnly para o web dashboard (protege contra XSS)
    res.cookie('accessToken', result.accessToken, COOKIE_OPTIONS_ACCESS);
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS_REFRESH);

    // Retornar tokens no body também para compatibilidade com o mobile
    return {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login com Google' })
  @ApiResponse({ status: 200, description: 'Login com Google realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Token do Google inválido' })
  async loginWithGoogle(
    @Body() dto: GoogleLoginDto,
    @Request() request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginWithGoogle(dto, request);

    res.cookie('accessToken', result.accessToken, COOKIE_OPTIONS_ACCESS);
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS_REFRESH);

    return {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token' })
  @ApiResponse({ status: 200, description: 'Token renovado com sucesso' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Request() request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Aceitar refresh token do body (mobile) ou do cookie (web)
    const refreshTokenValue = dto.refreshToken || request.cookies?.refreshToken;
    if (!refreshTokenValue) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Refresh token não fornecido' });
    }

    const tokens = await this.authService.refreshToken(
      { refreshToken: refreshTokenValue },
      request,
    );

    // Renovar cookies
    res.cookie('accessToken', tokens.accessToken, COOKIE_OPTIONS_ACCESS);
    res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS_REFRESH);

    // Retornar tokens também no body para compatibilidade com mobile
    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fazer logout' })
  @ApiResponse({ status: 200, description: 'Logout realizado com sucesso' })
  async logout(
    @CurrentUser() user: any,
    @Body() dto: RefreshTokenDto,
    @Request() request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshTokenValue = dto.refreshToken || request.cookies?.refreshToken;
    await this.authService.logout(user.id, refreshTokenValue);

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });

    return { message: 'Logout realizado com sucesso' };
  }

  // FIX #2: Endpoint para gerar token de curta duração exclusivo para WebSocket.
  // O web dashboard não tem acesso ao accessToken (cookie HttpOnly), então
  // este endpoint troca o cookie por um token de 2 minutos para o handshake WS.
  @UseGuards(JwtAuthGuard)
  @Post('ws-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gerar token de curta duração para WebSocket' })
  async getWsToken(@CurrentUser() user: any) {
    const token = await this.authService.generateWsToken(user.id, user.roles);
    return { token };
  }
}


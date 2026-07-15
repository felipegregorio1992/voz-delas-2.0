import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { AuditService } from '../audit/audit.service';
import { getIpFromRequest, getUserAgentFromRequest } from '../../common/utils/request-context.util';

// FIX #11: Dummy hash para normalizar tempo de resposta e evitar timing attacks.
// Garante que bcrypt.compare sempre execute, mesmo quando o usuário não existe.
const DUMMY_HASH = '$2b$12$invalidhashfortimingprotection00000000000000000000000000';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  async register(dto: RegisterDto, request: any) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email ou telefone deve ser fornecido');
    }

    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existingEmail) throw new ConflictException('Email já cadastrado');
    }

    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (existingPhone) throw new ConflictException('Telefone já cadastrado');
    }

    // FIX #5: custo 12 (mais resistente a brute-force que 10)
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await (this.prisma.user.create as any)({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        userRoles: {
          create: { role: { connect: { name: 'USER' } } },
        },
      },
      include: { userRoles: { include: { role: true } } },
    });

    // Marcar como conta APP via raw query (Prisma client ainda não tem o campo source)
    // APP é o default no banco, mas garantimos explicitamente
    await this.prisma.$executeRawUnsafe(
      `UPDATE users SET source = 'APP' WHERE id = ?`,
      user.id,
    );

    await this.auditService.log({
      userId: user.id,
      action: 'USER_REGISTERED',
      entity: 'User',
      entityId: user.id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
    });

    const tokens = await this.generateTokens(user.id, user.userRoles.map((ur) => ur.role.name));

    return {
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
      ...tokens,
    };
  }

  async login(dto: LoginDto, request: any, platform: 'web' | 'app' = 'app') {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          dto.email ? { email: dto.email } : undefined,
          dto.phone ? { phone: dto.phone } : undefined,
        ].filter(Boolean),
      },
      include: { userRoles: { include: { role: true } } },
    }) as any; // cast para incluir campo source (Prisma client desatualizado)

    // FIX #11: Sempre executar bcrypt.compare para evitar timing attack.
    const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
    const isPasswordValid = await bcrypt.compare(dto.password, hashToCompare);

    if (!user || !user.isActive || !isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Ler o campo source via raw query
    const sourceResult = (await this.prisma.$queryRawUnsafe(
      `SELECT source FROM users WHERE id = ?`,
      user.id,
    )) as { source: string }[];
    const userSource = sourceResult[0]?.source ?? 'APP';

    // Verificar restrição de plataforma:
    // - Contas APP (criadas pelo mobile) só podem logar no app
    // - Contas WEB (criadas pelo admin) só podem logar no web
    if (platform === 'web' && userSource === 'APP') {
      throw new UnauthorizedException('Esta conta só pode ser acessada pelo aplicativo mobile');
    }
    if (platform === 'app' && userSource === 'WEB') {
      throw new UnauthorizedException('Esta conta só pode ser acessada pelo painel web');
    }

    await this.auditService.log({
      userId: user.id,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user.id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
    });

    const tokens = await this.generateTokens(user.id, user.userRoles.map((ur) => ur.role.name));

    return {
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
      ...tokens,
    };
  }

  async loginWithGoogle(dto: GoogleLoginDto, request: any) {
    let payload: any;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Token do Google inválido');
    }

    if (!payload || !payload.email) {
      throw new UnauthorizedException('Não foi possível obter informações do Google');
    }

    const { email, name, sub: googleId } = payload;

    // Buscar usuário existente por email
    let user = await this.prisma.user.findUnique({
      where: { email },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) {
      // Criar novo usuário com dados do Google (sem senha)
      user = await (this.prisma.user.create as any)({
        data: {
          name: name || email.split('@')[0],
          email,
          passwordHash: '', // Conta Google não tem senha local
          userRoles: {
            create: { role: { connect: { name: 'USER' } } },
          },
        },
        include: { userRoles: { include: { role: true } } },
      });

      await this.prisma.$executeRawUnsafe(
        `UPDATE users SET source = 'APP' WHERE id = ?`,
        user.id,
      );

      await this.auditService.log({
        userId: user.id,
        action: 'USER_REGISTERED_GOOGLE',
        entity: 'User',
        entityId: user.id,
        ip: getIpFromRequest(request),
        userAgent: getUserAgentFromRequest(request),
      });
    } else {
      if (!user.isActive) {
        throw new UnauthorizedException('Conta desativada');
      }

      await this.auditService.log({
        userId: user.id,
        action: 'USER_LOGIN_GOOGLE',
        entity: 'User',
        entityId: user.id,
        ip: getIpFromRequest(request),
        userAgent: getUserAgentFromRequest(request),
      });
    }

    const tokens = await this.generateTokens(user.id, user.userRoles.map((ur) => ur.role.name));

    return {
      user: { id: user.id, name: user.name, email: user.email, phone: (user as any).phone },
      ...tokens,
    };
  }

  async refreshToken(dto: RefreshTokenDto, request: any) {
    // FIX #9: SHA-256 determinístico — bcrypt não serve para tokens (salt aleatório impede busca)
    const tokenHash = this.hashToken(dto.refreshToken);

    const refreshToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: { include: { userRoles: { include: { role: true } } } } },
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const tokens = await this.generateTokens(
      refreshToken.userId,
      refreshToken.user.userRoles.map((ur) => ur.role.name),
    );

    // Revogar token antigo (rotação de refresh token)
    await this.prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: { revokedAt: new Date() },
    });

    return tokens;
  }

  async logout(userId: string, refreshToken: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  private async generateTokens(userId: string, roles: string[]) {
    const payload = { sub: userId, roles };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
    });

    // FIX #9: SHA-256 para armazenar hash do refresh token
    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: refreshTokenHash, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  // FIX #9: SHA-256 síncrono e determinístico para tokens.
  // Diferente de senhas (que usam bcrypt), tokens não precisam de salt —
  // eles já são aleatórios por natureza.
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // FIX #2: Token de curta duração (2 min) exclusivo para handshake WebSocket.
  // O web dashboard não tem acesso ao accessToken (cookie HttpOnly), então
  // este método gera um token temporário apenas para o WS.
  async generateWsToken(userId: string, roles: string[]): Promise<string> {
    return this.jwtService.sign(
      { sub: userId, roles, purpose: 'ws' },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '2m', // Expira em 2 minutos — suficiente para o handshake
      },
    );
  }
}

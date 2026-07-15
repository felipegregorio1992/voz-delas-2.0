import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Request } from 'express';

// FIX #1: Extrair token do cookie HttpOnly OU do header Authorization (Bearer).
// O cookie é usado pelo web dashboard; o header Bearer é usado pelo mobile.
function extractJwtFromCookieOrHeader(req: Request): string | null {
  // 1. Tentar cookie HttpOnly (web)
  if (req?.cookies?.accessToken) {
    return req.cookies.accessToken;
  }
  // 2. Fallback para Bearer token no header (mobile)
  const authHeader = req?.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: extractJwtFromCookieOrHeader,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
      passReqToCallback: false,
    });
  }

  async validate(payload: any) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Token inválido: payload.sub não encontrado');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException(`Usuário não encontrado: ${payload.sub}`);
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuário inativo');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(
        user.userRoles
          .flatMap((ur) => ur.role.rolePermissions)
          .map((rp) => rp.permission.code),
      ),
    );

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      roles,
      permissions,
    };
  }
}

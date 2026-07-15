import { Injectable, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;
    
    // Log para debug
    if (!authHeader) {
      this.logger.warn(`401: Missing Authorization header - ${request.method} ${request.url}`);
    } else if (!authHeader.startsWith('Bearer ')) {
      this.logger.warn(`401: Invalid Authorization format - ${request.method} ${request.url}`);
    } else {
      this.logger.debug(`JWT Guard: Token presente - ${request.method} ${request.url}`);
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      const errorMessage = info?.message || err?.message || 'Token inválido ou ausente';
      this.logger.warn(`401: JWT validation failed - ${errorMessage}`);
      
      // Se for erro de token expirado ou inválido, lançar UnauthorizedException apropriada
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expirado. Faça login novamente.');
      }
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Token inválido. Faça login novamente.');
      }
      if (info?.name === 'NotBeforeError') {
        throw new UnauthorizedException('Token ainda não é válido.');
      }
      
      // Se já for uma HttpException, relançar
      if (err instanceof UnauthorizedException || err?.status === 401) {
        throw err;
      }
      
      // Caso padrão: lançar UnauthorizedException
      throw new UnauthorizedException(errorMessage);
    }
    return user;
  }
}


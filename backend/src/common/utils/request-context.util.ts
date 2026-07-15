import { ExecutionContext } from '@nestjs/common';

export function getRequestFromContext(context: ExecutionContext) {
  return context.switchToHttp().getRequest();
}

export function getIpFromRequest(request: any): string {
  return (
    request.headers['x-forwarded-for']?.split(',')[0] ||
    request.headers['x-real-ip'] ||
    request.connection?.remoteAddress ||
    request.socket?.remoteAddress ||
    'unknown'
  );
}

export function getUserAgentFromRequest(request: any): string {
  return request.headers['user-agent'] || 'unknown';
}


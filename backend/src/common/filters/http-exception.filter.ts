import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // FIX #10: Nunca expor detalhes internos em erros 500.
    // Para erros HTTP conhecidos, retornar mensagem estruturada sem vazar schema interno.
    let errorMessage: string | string[];

    if (isHttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        errorMessage = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, any>;
        // Retornar apenas o array de mensagens de validação (class-validator)
        // ou a mensagem de texto — nunca o objeto completo
        errorMessage = Array.isArray(resp.message) ? resp.message : (resp.message ?? resp.error ?? 'Erro na requisição');
      } else {
        errorMessage = 'Erro na requisição';
      }
    } else {
      // FIX #10: Erros 500 nunca expõem detalhes ao cliente
      errorMessage = 'Erro interno do servidor';
    }

    // FIX #10: Não incluir `path` em erros 500 (pode revelar estrutura interna)
    const errorResponse: Record<string, any> = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      error: errorMessage,
    };

    // Incluir path apenas para erros 4xx (útil para debug do cliente)
    if (status < 500) {
      errorResponse.path = request.url;
      errorResponse.method = request.method;
    }

    // Log interno completo (stack trace) — apenas no servidor, nunca no response
    this.logger.error(
      `${request.method} ${request.url} - ${status}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    response.status(status).json(errorResponse);
  }
}

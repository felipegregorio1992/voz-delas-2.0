import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IntegrationProvider, IntegrationJobStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async enqueuePanicIntegration(userId: string, panicEventId: string) {
    // Criar jobs de integração para cada provedor (stubs)
    const providers: IntegrationProvider[] = [
      IntegrationProvider.TJRJ,
      IntegrationProvider.DEAM,
      IntegrationProvider.GMAP,
    ];

    const jobs = await Promise.all(
      providers.map((provider) =>
        this.prisma.integrationJob.create({
          data: {
            userId,
            provider,
            payloadJson: JSON.stringify({ panicEventId, timestamp: new Date().toISOString() }),
            status: IntegrationJobStatus.PENDING,
          },
        }),
      ),
    );

    this.logger.log(`[INTEGRATION] Enfileirados ${jobs.length} jobs de integração para pânico ${panicEventId}`);

    return jobs;
  }

  async testIntegration(provider: IntegrationProvider, userId?: string) {
    // FIX #20: Stub com guard de ambiente — nunca executar lógica aleatória em produção
    if (process.env.NODE_ENV === 'production') {
      throw new Error('testIntegration não está disponível em produção');
    }

    const success = Math.random() > 0.3; // 70% de sucesso simulado (apenas dev/staging)

    const job = await this.prisma.integrationJob.create({
      data: {
        userId,
        provider,
        payloadJson: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
        status: success ? IntegrationJobStatus.SUCCESS : IntegrationJobStatus.FAILED,
        attempts: 1,
        lastError: success ? null : 'Erro simulado de integração (stub)',
      },
    });

    if (userId) {
      await this.auditService.log({
        userId,
        action: 'INTEGRATION_TEST',
        entity: 'IntegrationJob',
        entityId: job.id,
        detailsJson: JSON.stringify({ provider, success }),
      });
    }

    this.logger.log(
      `[INTEGRATION TEST] ${provider} - ${success ? 'SUCCESS' : 'FAILED'} (Job ID: ${job.id})`,
    );

    return {
      job,
      success,
      message: success
        ? `Integração ${provider} simulada com sucesso`
        : `Integração ${provider} falhou (simulado)`,
    };
  }
}


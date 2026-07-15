import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { getIpFromRequest, getUserAgentFromRequest } from '../../common/utils/request-context.util';
import { PanicStatus } from '@prisma/client';

@Injectable()
export class PanicService {
  private readonly logger = new Logger(PanicService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private integrationsService: IntegrationsService,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: string, request: any) {
    this.logger.log(`[PANIC] Criando evento de pânico para usuário ${userId}`);
    this.logger.debug(`[PANIC] userId type: ${typeof userId}, value: ${userId}`);

    // Verificar se userId é válido
    if (!userId || userId.trim() === '') {
      this.logger.error('[PANIC] userId é vazio ou inválido');
      throw new BadRequestException('ID do usuário inválido');
    }

    // Verificar se usuário existe
    try {
      const userExists = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isActive: true },
      });

      if (!userExists) {
        this.logger.error(`[PANIC] Usuário não encontrado: ${userId}`);
        throw new BadRequestException('Usuário não encontrado');
      }

      if (!userExists.isActive) {
        this.logger.error(`[PANIC] Usuário inativo: ${userId}`);
        throw new BadRequestException('Usuário inativo');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`[PANIC] Erro ao verificar usuário: ${error.message}`, error.stack);
      throw new BadRequestException('Erro ao verificar usuário');
    }

    // Verificar se já existe um pânico ativo e encerrá-lo antes de criar um novo
    try {
      const activePanic = await this.prisma.panicEvent.findFirst({
        where: {
          userId,
          status: PanicStatus.ACTIVE,
        },
      });

      if (activePanic) {
        this.logger.warn(`[PANIC] Usuário ${userId} já tem pânico ativo: ${activePanic.id}. Encerrando antes de criar novo.`);
        
        try {
          // Encerrar o pânico ativo anterior
          await this.prisma.panicEvent.update({
            where: { id: activePanic.id },
            data: {
              status: PanicStatus.ENDED,
              endedAt: new Date(),
            },
          });
          
          this.logger.log(`[PANIC] Pânico anterior ${activePanic.id} encerrado automaticamente`);
          
          // Registrar auditoria do encerramento automático (não bloqueante)
          this.auditService.log({
            userId,
            action: 'PANIC_AUTO_ENDED',
            entity: 'PanicEvent',
            entityId: activePanic.id,
            ip: getIpFromRequest(request),
            userAgent: getUserAgentFromRequest(request),
            detailsJson: JSON.stringify({ reason: 'Novo evento de pânico acionado, encerrando anterior automaticamente' }),
          }).catch((err) => {
            this.logger.warn(`[PANIC] Erro ao registrar auditoria de encerramento automático: ${err.message}`);
          });
        } catch (updateError: any) {
          // Se falhar ao encerrar, logar mas continuar para criar o novo
          this.logger.error(`[PANIC] Erro ao encerrar pânico anterior ${activePanic.id}: ${updateError.message}`);
          // Continuar mesmo assim - tentar criar o novo evento
        }
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`[PANIC] Erro ao verificar/encerrar pânico ativo: ${error.message}`, error.stack);
      // Continuar mesmo se houver erro na verificação
    }

    // Criar evento de pânico (operação principal - deve sempre funcionar)
    let panicEvent;
    try {
      this.logger.debug(`[PANIC] Criando PanicEvent com userId: ${userId}, status: ${PanicStatus.ACTIVE}`);
      
      panicEvent = await this.prisma.panicEvent.create({
        data: {
          userId,
          status: PanicStatus.ACTIVE,
        },
        include: {
          locations: true,
        },
      });
      
      this.logger.log(`[PANIC] ✅ Evento criado com sucesso: ${panicEvent.id}`);
    } catch (error: any) {
      this.logger.error(`[PANIC] ❌ Erro ao criar evento: ${error.message}`);
      this.logger.error(`[PANIC] Stack: ${error.stack}`);
      this.logger.error(`[PANIC] Code: ${error.code}`);
      this.logger.error(`[PANIC] Meta: ${JSON.stringify(error.meta)}`);
      
      // Mensagens de erro mais específicas
      if (error.code === 'P2003') {
        throw new BadRequestException(`Erro de foreign key: ${error.meta?.field_name || 'campo desconhecido'}`);
      }
      if (error.code === 'P2000') {
        throw new BadRequestException(`Valor inválido: ${error.meta?.target || 'campo desconhecido'}`);
      }
      
      throw new BadRequestException(`Erro ao criar evento de pânico: ${error.message}`);
    }

    // Operações secundárias (não devem quebrar o fluxo principal)
    
    // 1. Auditoria
    this._logAudit(userId, panicEvent.id, request).catch((err) => {
      this.logger.warn(`[PANIC] Erro ao registrar auditoria: ${err.message}`);
    });

    // 2. Buscar e notificar contatos (em paralelo, não bloqueante)
    this._notifyContacts(userId, panicEvent.id).catch((err) => {
      this.logger.warn(`[PANIC] Erro ao notificar contatos: ${err.message}`);
    });

    // 3. Enfileirar integrações (em paralelo, não bloqueante)
    this._enqueueIntegrations(userId, panicEvent.id).catch((err) => {
      this.logger.warn(`[PANIC] Erro ao enfileirar integrações: ${err.message}`);
    });

    // Retornar o evento imediatamente (não esperar operações secundárias)
    return panicEvent;
  }

  private async _logAudit(userId: string, panicEventId: string, request: any) {
    try {
      await this.auditService.log({
        userId,
        action: 'PANIC_ACTIVATED',
        entity: 'PanicEvent',
        entityId: panicEventId,
        ip: getIpFromRequest(request),
        userAgent: getUserAgentFromRequest(request),
      });
      this.logger.debug(`[PANIC] Auditoria registrada para evento ${panicEventId}`);
    } catch (error) {
      this.logger.error(`[PANIC] Erro ao registrar auditoria: ${error.message}`);
      throw error;
    }
  }

  private async _notifyContacts(userId: string, panicEventId: string) {
    try {
      const trustedContacts = await this.prisma.trustedContact.findMany({
        where: { userId },
      });

      this.logger.log(`[PANIC] Encontrados ${trustedContacts.length} contatos de confiança`);

      // Notificar cada contato (não esperar uns pelos outros)
      const notificationPromises = trustedContacts.map((contact) =>
        this.notificationsService
          .sendPanicNotification(userId, panicEventId, contact)
          .catch((err) => {
            this.logger.warn(`[PANIC] Erro ao notificar contato ${contact.id}: ${err.message}`);
            return null; // Não falhar se um contato falhar
          }),
      );

      await Promise.allSettled(notificationPromises);
      this.logger.debug(`[PANIC] Notificações processadas para evento ${panicEventId}`);
    } catch (error) {
      this.logger.error(`[PANIC] Erro ao processar notificações: ${error.message}`);
      throw error;
    }
  }

  private async _enqueueIntegrations(userId: string, panicEventId: string) {
    try {
      await this.integrationsService.enqueuePanicIntegration(userId, panicEventId);
      this.logger.debug(`[PANIC] Integrações enfileiradas para evento ${panicEventId}`);
    } catch (error) {
      this.logger.error(`[PANIC] Erro ao enfileirar integrações: ${error.message}`);
      throw error;
    }
  }

  async addLocation(panicEventId: string, userId: string, lat: number, lng: number, accuracy?: number) {
    const panicEvent = await this.prisma.panicEvent.findUnique({
      where: { id: panicEventId },
    });

    if (!panicEvent) {
      throw new NotFoundException('Evento de pânico não encontrado');
    }

    if (panicEvent.userId !== userId) {
      throw new BadRequestException('Evento de pânico não pertence ao usuário');
    }

    if (panicEvent.status !== PanicStatus.ACTIVE) {
      throw new BadRequestException('Evento de pânico não está ativo');
    }

    return this.prisma.panicLocation.create({
      data: {
        panicEventId,
        lat,
        lng,
        accuracy,
      },
    });
  }

  async end(panicEventId: string, userId: string, request: any) {
    const panicEvent = await this.prisma.panicEvent.findUnique({
      where: { id: panicEventId },
    });

    if (!panicEvent) {
      throw new NotFoundException('Evento de pânico não encontrado');
    }

    if (panicEvent.userId !== userId) {
      throw new BadRequestException('Evento de pânico não pertence ao usuário');
    }

    if (panicEvent.status !== PanicStatus.ACTIVE) {
      throw new BadRequestException('Evento de pânico já foi encerrado');
    }

    const updated = await this.prisma.panicEvent.update({
      where: { id: panicEventId },
      data: {
        status: PanicStatus.ENDED,
        endedAt: new Date(),
      },
    });

    // Auditoria
    await this.auditService.log({
      userId,
      action: 'PANIC_ENDED',
      entity: 'PanicEvent',
      entityId: panicEventId,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
    });

    return updated;
  }

  async findAllForAdmin() {
    try {
      this.logger.debug('[ADMIN] Buscando todos os eventos de pânico');
      const events = await this.prisma.panicEvent.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          locations: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { startedAt: 'desc' },
      });
      this.logger.debug(`[ADMIN] Encontrados ${events.length} eventos de pânico`);
      return events;
    } catch (error: any) {
      this.logger.error(`[ADMIN] Erro ao buscar eventos de pânico: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findActiveForUser(userId: string) {
    try {
      this.logger.debug(`[PANIC] Buscando pânico ativo para usuário ${userId}`);
      const activePanic = await this.prisma.panicEvent.findFirst({
        where: {
          userId,
          status: PanicStatus.ACTIVE,
        },
        include: {
          locations: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { startedAt: 'desc' },
      });
      
      if (activePanic) {
        this.logger.debug(`[PANIC] Pânico ativo encontrado: ${activePanic.id}`);
      } else {
        this.logger.debug(`[PANIC] Nenhum pânico ativo encontrado para usuário ${userId}`);
      }
      
      return activePanic;
    } catch (error: any) {
      this.logger.error(`[PANIC] Erro ao buscar pânico ativo: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findActiveForAdmin() {
    try {
      this.logger.debug('[ADMIN] Buscando eventos de pânico ativos');
      const events = await this.prisma.panicEvent.findMany({
        where: {
          status: PanicStatus.ACTIVE,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          locations: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { startedAt: 'desc' },
      });
      
      // Adicionar contatos de confiança para cada evento
      const eventsWithContacts = await Promise.all(
        events.map(async (event) => {
          const trustedContacts = await this.prisma.trustedContact.findMany({
            where: { userId: event.userId },
            select: {
              id: true,
              name: true,
              phone: true,
            },
            orderBy: { createdAt: 'asc' },
            take: 3, // Máximo de 3 contatos
          });
          
          return {
            ...event,
            user: {
              ...event.user,
              trustedContacts: trustedContacts.map(contact => ({
                name: contact.name,
                phone: contact.phone,
              })),
            },
          };
        }),
      );
      
      this.logger.debug(`[ADMIN] Encontrados ${events.length} eventos de pânico ativos`);
      return eventsWithContacts;
    } catch (error: any) {
      this.logger.error(`[ADMIN] Erro ao buscar eventos de pânico ativos: ${error.message}`, error.stack);
      throw error;
    }
  }
}


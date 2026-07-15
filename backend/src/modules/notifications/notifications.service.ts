import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TrustedContact } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async sendPanicNotification(userId: string, panicEventId: string, contact: TrustedContact) {
    // MVP: Apenas logar e registrar auditoria
    // Em produção, aqui você integraria com SMS/WhatsApp/Push notifications

    // FIX #19: Mascarar número de telefone nos logs — logs são menos seguros que o banco
    const maskedPhone = contact.phone.length > 4
      ? contact.phone.slice(0, -4).replace(/\d/g, '*') + contact.phone.slice(-4)
      : '****';

    this.logger.log(
      `[PANIC NOTIFICATION] Enviando notificação para ${contact.name} (${maskedPhone}) sobre evento de pânico ${panicEventId}`,
    );

    await this.auditService.log({
      userId,
      action: 'PANIC_NOTIFICATION_SENT',
      entity: 'PanicEvent',
      entityId: panicEventId,
      detailsJson: JSON.stringify({
        contactId: contact.id,
        contactName: contact.name,
        contactPhone: contact.phone,
        method: 'STUB',
      }),
    });

    // Simular sucesso
    return { success: true, method: 'STUB' };
  }
}


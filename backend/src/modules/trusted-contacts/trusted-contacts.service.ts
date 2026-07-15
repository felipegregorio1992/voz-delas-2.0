import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTrustedContactDto } from './dto/create-trusted-contact.dto';
import { UpdateTrustedContactDto } from './dto/update-trusted-contact.dto';
import { AuditService } from '../audit/audit.service';
import { getIpFromRequest, getUserAgentFromRequest } from '../../common/utils/request-context.util';

const MAX_TRUSTED_CONTACTS = 3;

@Injectable()
export class TrustedContactsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(userId: string) {
    return this.prisma.trustedContact.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateTrustedContactDto, request: any) {
    // Verificar limite de 3 contatos
    const count = await this.prisma.trustedContact.count({
      where: { userId },
    });

    if (count >= MAX_TRUSTED_CONTACTS) {
      throw new BadRequestException(
        `Limite máximo de ${MAX_TRUSTED_CONTACTS} contatos de confiança atingido`,
      );
    }

    const contact = await this.prisma.trustedContact.create({
      data: {
        userId,
        name: dto.name,
        phone: dto.phone,
        relationship: dto.relationship,
      },
    });

    // Auditoria
    await this.auditService.log({
      userId,
      action: 'TRUSTED_CONTACT_CREATED',
      entity: 'TrustedContact',
      entityId: contact.id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
    });

    return contact;
  }

  async update(userId: string, id: string, dto: UpdateTrustedContactDto, request: any) {
    const contact = await this.prisma.trustedContact.findUnique({
      where: { id },
    });

    if (!contact) {
      throw new NotFoundException('Contato de confiança não encontrado');
    }

    if (contact.userId !== userId) {
      throw new ForbiddenException('Você não tem permissão para atualizar este contato');
    }

    const updated = await this.prisma.trustedContact.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.relationship !== undefined && { relationship: dto.relationship }),
      },
    });

    // Auditoria
    await this.auditService.log({
      userId,
      action: 'TRUSTED_CONTACT_UPDATED',
      entity: 'TrustedContact',
      entityId: updated.id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
    });

    return updated;
  }

  async remove(userId: string, id: string, request: any) {
    const contact = await this.prisma.trustedContact.findUnique({
      where: { id },
    });

    if (!contact) {
      throw new NotFoundException('Contato de confiança não encontrado');
    }

    if (contact.userId !== userId) {
      throw new ForbiddenException('Você não tem permissão para remover este contato');
    }

    await this.prisma.trustedContact.delete({
      where: { id },
    });

    // Auditoria
    await this.auditService.log({
      userId,
      action: 'TRUSTED_CONTACT_DELETED',
      entity: 'TrustedContact',
      entityId: id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
    });
  }
}


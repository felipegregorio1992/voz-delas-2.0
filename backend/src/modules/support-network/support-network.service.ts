import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSupportServiceDto } from './dto/create-support-service.dto';
import { UpdateSupportServiceDto } from './dto/update-support-service.dto';
import { AuditService } from '../audit/audit.service';
import { getIpFromRequest, getUserAgentFromRequest } from '../../common/utils/request-context.util';

@Injectable()
export class SupportNetworkService {
  private readonly logger = new Logger(SupportNetworkService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll() {
    return this.prisma.supportService.findMany({
      orderBy: [
        { type: 'asc' },
        { city: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async findAllActive() {
    return this.prisma.supportService.findMany({
      where: { isActive: true },
      orderBy: [
        { type: 'asc' },
        { city: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async create(dto: CreateSupportServiceDto, userId: string, request: any) {
    const service = await this.prisma.supportService.create({
      data: dto,
    });

    await this.auditService.log({
      userId,
      action: 'SUPPORT_SERVICE_CREATED',
      entity: 'SupportService',
      entityId: service.id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      detailsJson: JSON.stringify({ type: dto.type, name: dto.name }),
    });

    this.logger.log(`[SUPPORT] Serviço criado: ${service.id} - ${service.name}`);

    return service;
  }

  async update(id: string, dto: UpdateSupportServiceDto, userId: string, request: any) {
    const service = await this.prisma.supportService.findUnique({
      where: { id },
    });

    if (!service) {
      throw new NotFoundException('Serviço não encontrado');
    }

    const updated = await this.prisma.supportService.update({
      where: { id },
      data: dto,
    });

    await this.auditService.log({
      userId,
      action: 'SUPPORT_SERVICE_UPDATED',
      entity: 'SupportService',
      entityId: id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      detailsJson: JSON.stringify(dto),
    });

    return updated;
  }

  async delete(id: string, userId: string, request: any) {
    const service = await this.prisma.supportService.findUnique({
      where: { id },
    });

    if (!service) {
      throw new NotFoundException('Serviço não encontrado');
    }

    await this.prisma.supportService.delete({
      where: { id },
    });

    await this.auditService.log({
      userId,
      action: 'SUPPORT_SERVICE_DELETED',
      entity: 'SupportService',
      entityId: id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
    });

    this.logger.log(`[SUPPORT] Serviço excluído: ${id} - ${service.name}`);

    return { message: 'Serviço excluído com sucesso' };
  }

  async findOne(id: string) {
    const service = await this.prisma.supportService.findUnique({
      where: { id },
    });

    if (!service) {
      throw new NotFoundException('Serviço não encontrado');
    }

    return service;
  }
}


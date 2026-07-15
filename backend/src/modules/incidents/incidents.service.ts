import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { AuditService } from '../audit/audit.service';
import { getIpFromRequest, getUserAgentFromRequest } from '../../common/utils/request-context.util';

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(userId: string, dto: CreateIncidentDto, request: any) {
    // Criar a denúncia
    const incident = await this.prisma.incident.create({
      data: {
        userId,
        type: dto.type,
        description: dto.description,
      },
      include: {
        locations: true,
      },
    });

    this.logger.log(`[INCIDENT] Denúncia criada: ${incident.id} para usuário ${userId}`);

    // Se a localização foi fornecida, criar a localização inicial
    if (dto.lat != null && dto.lng != null) {
      try {
        await this.prisma.incidentLocation.create({
          data: {
            incidentId: incident.id,
            lat: dto.lat,
            lng: dto.lng,
            accuracy: dto.accuracy,
          },
        });
        this.logger.log(`[INCIDENT] Localização inicial registrada para denúncia ${incident.id}: lat=${dto.lat}, lng=${dto.lng}`);
      } catch (error: any) {
        // Log do erro mas não falha a criação da denúncia
        this.logger.warn(`[INCIDENT] Erro ao registrar localização inicial: ${error.message}`);
      }
    } else {
      this.logger.debug(`[INCIDENT] Nenhuma localização inicial fornecida para denúncia ${incident.id}`);
    }

    // Buscar a denúncia com todas as localizações atualizadas
    const incidentWithLocations = await this.prisma.incident.findUnique({
      where: { id: incident.id },
      include: {
        locations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Auditoria
    await this.auditService.log({
      userId,
      action: 'INCIDENT_CREATED',
      entity: 'Incident',
      entityId: incident.id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      detailsJson: JSON.stringify({ 
        type: dto.type,
        hasInitialLocation: dto.lat != null && dto.lng != null,
      }),
    });

    return incidentWithLocations;
  }

  async findOne(id: string, userId: string, userPermissions: string[]) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: {
        locations: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!incident) {
      throw new NotFoundException('Denúncia não encontrada');
    }

    // Apenas o dono ou staff pode ver
    const isOwner = incident.userId === userId;
    const isStaff = Array.isArray(userPermissions) && userPermissions.includes('INCIDENTS_VIEW');

    if (!isOwner && !isStaff) {
      throw new ForbiddenException('Você não tem permissão para ver esta denúncia');
    }

    return incident;
  }

  async findAllForAdmin(userPermissions: string[]) {
    try {
      if (!userPermissions || !Array.isArray(userPermissions)) {
        throw new ForbiddenException('Permissões inválidas ou não encontradas');
      }

      if (!userPermissions.includes('INCIDENTS_VIEW')) {
        throw new ForbiddenException('Acesso negado');
      }

      return await this.findAllForAdminDirect();
    } catch (error: any) {
      console.error('[INCIDENTS] Erro ao buscar incidents para admin:', error);
      throw error;
    }
  }

  // Método sem filtro de role — a autorização é feita pelo RolesGuard no controller
  async findAllForAdminDirect() {
    return this.prisma.incident.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        locations: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}


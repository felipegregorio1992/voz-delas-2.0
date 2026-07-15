import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateMerchantRequestDto } from './dto/create-merchant-request.dto';
import { UpdateMerchantRequestDto } from './dto/update-merchant-request.dto';
import { MerchantRequestStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { getIpFromRequest, getUserAgentFromRequest } from '../../common/utils/request-context.util';

@Injectable()
export class MerchantRequestsService {
  private readonly logger = new Logger(MerchantRequestsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(userId: string, dto: CreateMerchantRequestDto, request: any) {
    const existingRequest = await this.prisma.merchantRequest.findUnique({ where: { userId } });

    if (existingRequest) {
      if (existingRequest.status === MerchantRequestStatus.PENDING) {
        throw new BadRequestException('Você já possui uma solicitação pendente');
      }
      if (existingRequest.status === MerchantRequestStatus.APPROVED) {
        throw new BadRequestException('Você já é uma empreendedora aprovada');
      }
      // Se REJECTED, permite criar nova solicitação (deleta a antiga)
      await this.prisma.merchantRequest.delete({ where: { userId } });
    }

    const existingMerchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (existingMerchant) {
      throw new BadRequestException('Você já possui uma loja cadastrada');
    }

    const merchantRequest = await this.prisma.merchantRequest.create({
      data: { userId, ...dto, status: MerchantRequestStatus.PENDING },
    });

    await this.auditService.log({
      userId,
      action: 'MERCHANT_REQUEST_CREATED',
      entity: 'MerchantRequest',
      entityId: merchantRequest.id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
    });

    this.logger.log(`[MERCHANT_REQUEST] Solicitação criada: ${merchantRequest.id} para usuário ${userId}`);
    return merchantRequest;
  }

  async updateMyRequest(userId: string, dto: CreateMerchantRequestDto, request: any) {
    const existingRequest = await this.prisma.merchantRequest.findUnique({ where: { userId } });

    if (!existingRequest) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    if (existingRequest.status !== MerchantRequestStatus.REJECTED) {
      throw new BadRequestException('Só é possível editar solicitações rejeitadas');
    }

    const updated = await this.prisma.merchantRequest.update({
      where: { userId },
      data: { ...dto, status: MerchantRequestStatus.PENDING, rejectionReason: null, reviewedBy: null, reviewedAt: null },
    });

    await this.auditService.log({
      userId,
      action: 'MERCHANT_REQUEST_UPDATED',
      entity: 'MerchantRequest',
      entityId: updated.id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
    });

    return updated;
  }

  async findMyRequest(userId: string) {
    return this.prisma.merchantRequest.findUnique({
      where: { userId },
      include: {
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
  }

  async findAll() {
    return this.prisma.merchantRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPending() {
    return this.prisma.merchantRequest.findMany({
      where: { status: MerchantRequestStatus.PENDING },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateMerchantRequestDto,
    reviewerId: string,
    request: any,
  ) {
    const requestRecord = await this.prisma.merchantRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!requestRecord) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    if (requestRecord.status !== MerchantRequestStatus.PENDING) {
      throw new BadRequestException('Esta solicitação já foi processada');
    }

    // Atualizar status
    const updated = await this.prisma.merchantRequest.update({
      where: { id },
      data: {
        status: dto.status,
        rejectionReason: dto.rejectionReason,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });

    // Se aprovado, criar a loja automaticamente
    if (dto.status === MerchantRequestStatus.APPROVED) {
      await this.prisma.merchant.create({
        data: {
          userId: requestRecord.userId,
          businessName: requestRecord.businessName,
          description: requestRecord.description,
          phone: requestRecord.phone,
          email: requestRecord.email,
          address: requestRecord.address,
          city: requestRecord.city,
          isActive: true,
        },
      });

      this.logger.log(`[MERCHANT] Loja criada automaticamente para usuário ${requestRecord.userId}`);
    }

    await this.auditService.log({
      userId: reviewerId,
      action: `MERCHANT_REQUEST_${dto.status}`,
      entity: 'MerchantRequest',
      entityId: id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      detailsJson: JSON.stringify({ 
        status: dto.status,
        rejectionReason: dto.rejectionReason,
        userId: requestRecord.userId,
      }),
    });

    return updated;
  }
}

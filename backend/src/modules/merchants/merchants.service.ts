import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { AuditService } from '../audit/audit.service';
import { getIpFromRequest, getUserAgentFromRequest } from '../../common/utils/request-context.util';

@Injectable()
export class MerchantsService {
  private readonly logger = new Logger(MerchantsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findMyMerchant(userId: string) {
    const merchant = await this.prisma.merchant.findUnique({
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
        products: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!merchant) {
      throw new NotFoundException('Loja não encontrada');
    }

    return merchant;
  }

  async updateMyMerchant(userId: string, dto: UpdateMerchantDto, request: any) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new NotFoundException('Loja não encontrada');
    }

    const updated = await this.prisma.merchant.update({
      where: { userId },
      data: dto,
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

    await this.auditService.log({
      userId,
      action: 'MERCHANT_UPDATED',
      entity: 'Merchant',
      entityId: merchant.id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
    });

    return updated;
  }

  async findAll(userPermissions: string[]) {
    const canView = userPermissions?.includes('MERCHANTS_VIEW');
    if (!canView) {
      throw new ForbiddenException('Acesso negado');
    }

    return this.prisma.merchant.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        products: {
          where: { status: 'ACTIVE' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllPublic() {
    return this.prisma.merchant.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        products: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOnePublic(id: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id, isActive: true },
      include: {
        user: { select: { id: true, name: true } },
        products: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!merchant) throw new NotFoundException('Loja não encontrada');
    return merchant;
  }

  async toggleActive(id: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id } });
    if (!merchant) throw new NotFoundException('Loja não encontrada');

    return this.prisma.merchant.update({
      where: { id },
      data: { isActive: !merchant.isActive },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
  }
}

import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AuditService } from '../audit/audit.service';
import { getIpFromRequest, getUserAgentFromRequest } from '../../common/utils/request-context.util';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(userId: string, dto: CreateProductDto, request: any) {
    // Verificar se o usuário tem uma loja
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new ForbiddenException('Você precisa ter uma loja cadastrada para criar produtos');
    }

    const product = await this.prisma.product.create({
      data: {
        merchantId: merchant.id,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        imageUrl: dto.imageUrl,
        category: dto.category,
        stock: dto.stock ?? 0,
        status: 'ACTIVE',
      },
    });

    await this.auditService.log({
      userId,
      action: 'PRODUCT_CREATED',
      entity: 'Product',
      entityId: product.id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
    });

    return product;
  }

  async findMyProducts(userId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new NotFoundException('Loja não encontrada');
    }

    return this.prisma.product.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(userId: string, productId: string, dto: UpdateProductDto, request: any) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { merchant: true },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    if (product.merchant.userId !== userId) {
      throw new ForbiddenException('Você não tem permissão para editar este produto');
    }

    // FIX #8: Enumerar campos explicitamente — nunca passar `dto` direto ao Prisma.
    // Isso evita mass assignment caso novos campos sejam adicionados ao DTO.
    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.stock !== undefined && { stock: dto.stock }),
        ...(dto.status !== undefined && { status: dto.status }),
        // merchantId e createdAt nunca são atualizáveis pelo usuário
      },
    });

    await this.auditService.log({
      userId,
      action: 'PRODUCT_UPDATED',
      entity: 'Product',
      entityId: productId,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
    });

    return updated;
  }

  async delete(userId: string, productId: string, request: any) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { merchant: true },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    if (product.merchant.userId !== userId) {
      throw new ForbiddenException('Você não tem permissão para excluir este produto');
    }

    await this.prisma.product.delete({
      where: { id: productId },
    });

    await this.auditService.log({
      userId,
      action: 'PRODUCT_DELETED',
      entity: 'Product',
      entityId: productId,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
    });

    return { message: 'Produto excluído com sucesso' };
  }

  async findAllPublic() {
    return this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        merchant: {
          isActive: true,
        },
      },
      include: {
        merchant: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByMerchantPublic(merchantId: string) {
    return this.prisma.product.findMany({
      where: {
        merchantId,
        status: 'ACTIVE',
        merchant: {
          isActive: true,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

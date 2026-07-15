import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AuditService } from '../audit/audit.service';
import { getIpFromRequest, getUserAgentFromRequest } from '../../common/utils/request-context.util';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);
  private readonly uploadsDir: string;

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {
    this.uploadsDir = path.resolve(process.cwd(), 'uploads', 'announcements');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  private saveImage(file: Express.Multer.File): string {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`Tipo de imagem não permitido: ${file.mimetype}. Permitidos: JPG, PNG, WebP, GIF`);
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException('Imagem excede o tamanho máximo de 5MB');
    }

    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${crypto.randomUUID()}${ext}`;
    const filepath = path.join(this.uploadsDir, filename);

    fs.writeFileSync(filepath, file.buffer);

    return `/uploads/announcements/${filename}`;
  }

  async findAll() {
    return this.prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActiveForApp(userId?: string) {
    const now = new Date();

    const announcements = await this.prisma.announcement.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: { gte: now } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!userId) {
      return announcements;
    }

    // Buscar dismissals do usuário para filtrar avisos já dispensados
    const dismissals = await this.prisma.announcementDismissal.findMany({
      where: { userId },
      select: { announcementId: true },
    });

    const dismissedIds = new Set(dismissals.map((d) => d.announcementId));

    return announcements.map((a) => ({
      ...a,
      dismissed: dismissedIds.has(a.id),
    }));
  }

  async findOne(id: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      throw new NotFoundException('Anúncio não encontrado');
    }

    return announcement;
  }

  async create(dto: CreateAnnouncementDto, userId: string, request: any, file?: Express.Multer.File) {
    const data: any = {
      title: dto.title,
      type: dto.type,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    };

    if (dto.content) data.content = dto.content;
    if (dto.linkUrl) data.linkUrl = dto.linkUrl;
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);

    // Upload de imagem
    if (file) {
      data.imageUrl = this.saveImage(file);
    }

    const announcement = await this.prisma.announcement.create({ data });

    await this.auditService.log({
      userId,
      action: 'ANNOUNCEMENT_CREATED',
      entity: 'Announcement',
      entityId: announcement.id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      detailsJson: JSON.stringify({ type: dto.type, title: dto.title }),
    });

    this.logger.log(`[ANNOUNCEMENT] Criado: ${announcement.id} - ${announcement.title}`);

    return announcement;
  }

  async update(id: string, dto: UpdateAnnouncementDto, userId: string, request: any, file?: Express.Multer.File) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Anúncio não encontrado');
    }

    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);

    // Upload de nova imagem
    if (file) {
      // Remover imagem antiga se existir
      if (existing.imageUrl) {
        const oldPath = path.resolve(process.cwd(), existing.imageUrl.replace(/^\//, ''));
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      data.imageUrl = this.saveImage(file);
    }

    // Remover campo imageUrl do DTO se não veio arquivo (evitar sobrescrever com string vazia)
    if (!file && 'imageUrl' in data && !data.imageUrl) {
      delete data.imageUrl;
    }

    const updated = await this.prisma.announcement.update({
      where: { id },
      data,
    });

    await this.auditService.log({
      userId,
      action: 'ANNOUNCEMENT_UPDATED',
      entity: 'Announcement',
      entityId: id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      detailsJson: JSON.stringify(dto),
    });

    return updated;
  }

  async delete(id: string, userId: string, request: any) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Anúncio não encontrado');
    }

    // Remover imagem do disco
    if (existing.imageUrl) {
      const imgPath = path.resolve(process.cwd(), existing.imageUrl.replace(/^\//, ''));
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    }

    await this.prisma.announcement.delete({ where: { id } });

    await this.auditService.log({
      userId,
      action: 'ANNOUNCEMENT_DELETED',
      entity: 'Announcement',
      entityId: id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
    });

    this.logger.log(`[ANNOUNCEMENT] Excluído: ${id} - ${existing.title}`);

    return { message: 'Anúncio excluído com sucesso' };
  }

  async dismiss(announcementId: string, userId: string) {
    const existing = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!existing) {
      throw new NotFoundException('Anúncio não encontrado');
    }

    await this.prisma.announcementDismissal.upsert({
      where: {
        announcementId_userId: { announcementId, userId },
      },
      update: {},
      create: { announcementId, userId },
    });

    return { message: 'Aviso dispensado com sucesso' };
  }
}

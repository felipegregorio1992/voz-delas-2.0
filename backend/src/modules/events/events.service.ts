import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly uploadsDir: string;

  constructor(private prisma: PrismaService) {
    this.uploadsDir = path.resolve(process.cwd(), 'uploads', 'events');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  private saveImage(file: Express.Multer.File): string {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`Tipo de imagem não permitido: ${file.mimetype}`);
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException('Imagem excede 5MB');
    }
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${crypto.randomUUID()}${ext}`;
    fs.writeFileSync(path.join(this.uploadsDir, filename), file.buffer);
    return `/uploads/events/${filename}`;
  }

  async findAll() {
    return this.prisma.event.findMany({
      orderBy: { startDate: 'asc' },
      include: {
        _count: {
          select: {
            registrations: { where: { status: 'CONFIRMED' } },
          },
        },
      },
    });
  }

  async findPublished() {
    return this.prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
      },
      orderBy: { startDate: 'asc' },
      include: {
        _count: {
          select: {
            registrations: { where: { status: 'CONFIRMED' } },
          },
        },
      },
    });
  }

  async findPublishedForUser(userId: string) {
    const events = await this.findPublished();

    const registrations = await this.prisma.eventRegistration.findMany({
      where: { userId },
      select: { eventId: true, status: true },
    });

    const regMap = new Map(registrations.map((r) => [r.eventId, r.status]));

    return events.map((e) => ({
      ...e,
      registrationStatus: regMap.get(e.id) || null,
      slotsUsed: e._count.registrations,
    }));
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        registrations: {
          include: { event: false },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            registrations: { where: { status: 'CONFIRMED' } },
          },
        },
      },
    });
    if (!event) throw new NotFoundException('Evento não encontrado');
    return event;
  }

  async create(dto: CreateEventDto, userId: string, file?: Express.Multer.File) {
    const data: any = {
      title: dto.title,
      category: dto.category,
      status: 'PUBLISHED',
      startDate: new Date(dto.startDate),
      createdBy: userId,
    };

    if (dto.description) data.description = dto.description;
    if (dto.location) data.location = dto.location;
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    if (dto.startTime) data.startTime = dto.startTime;
    if (dto.endTime) data.endTime = dto.endTime;
    if (dto.maxSlots) data.maxSlots = dto.maxSlots;
    if (dto.isRecurring !== undefined) data.isRecurring = dto.isRecurring;
    if (dto.recurringDays) data.recurringDays = dto.recurringDays;
    if (dto.sector) data.sector = dto.sector;
    if (dto.program) data.program = dto.program;
    if (file) data.imageUrl = this.saveImage(file);

    const event = await this.prisma.event.create({ data });

    // Criar aviso automático para o evento aparecer nas notificações do app
    const startDateFormatted = new Date(dto.startDate).toLocaleDateString('pt-BR');
    const timeInfo = dto.startTime ? ` às ${dto.startTime}` : '';
    const locationInfo = dto.location ? ` | Local: ${dto.location}` : '';

    await this.prisma.announcement.create({
      data: {
        title: `📅 ${event.title}`,
        content: `Novo evento: ${event.title} - ${startDateFormatted}${timeInfo}${locationInfo}. Abra "Eventos e Atividades" para se inscrever!`,
        type: 'NOTICE',
        isActive: true,
        startDate: new Date(),
        endDate: data.endDate || data.startDate,
        linkUrl: null,
        imageUrl: data.imageUrl || null,
      },
    });

    this.logger.log(`[EVENT] Criado: ${event.id} - ${event.title} (aviso gerado)`);
    return event;
  }

  async update(id: string, dto: UpdateEventDto, file?: Express.Multer.File) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Evento não encontrado');

    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    if (dto.maxSlots) data.maxSlots = Number(dto.maxSlots);

    if (file) {
      if (existing.imageUrl) {
        const oldPath = path.resolve(process.cwd(), existing.imageUrl.replace(/^\//, ''));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      data.imageUrl = this.saveImage(file);
    }

    return this.prisma.event.update({ where: { id }, data });
  }

  async delete(id: string) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Evento não encontrado');

    if (existing.imageUrl) {
      const imgPath = path.resolve(process.cwd(), existing.imageUrl.replace(/^\//, ''));
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await this.prisma.event.delete({ where: { id } });
    return { message: 'Evento excluído com sucesso' };
  }

  // ── Inscrições ──────────────────────────────────────────────────────────────

  async register(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: {
          select: {
            registrations: { where: { status: 'CONFIRMED' } },
          },
        },
      },
    });

    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.status !== 'PUBLISHED') throw new BadRequestException('Evento não está aberto para inscrições');

    if (event.maxSlots && event._count.registrations >= event.maxSlots) {
      throw new BadRequestException('Vagas esgotadas para este evento');
    }

    const existing = await this.prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (existing && existing.status === 'CONFIRMED') {
      throw new BadRequestException('Você já está inscrito neste evento');
    }

    if (existing && existing.status === 'CANCELLED') {
      return this.prisma.eventRegistration.update({
        where: { id: existing.id },
        data: { status: 'CONFIRMED' },
      });
    }

    return this.prisma.eventRegistration.create({
      data: { eventId, userId, status: 'CONFIRMED' },
    });
  }

  async cancelRegistration(eventId: string, userId: string) {
    const reg = await this.prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (!reg) throw new NotFoundException('Inscrição não encontrada');

    return this.prisma.eventRegistration.update({
      where: { id: reg.id },
      data: { status: 'CANCELLED' },
    });
  }

  async getRegistrations(eventId: string) {
    const registrations = await this.prisma.eventRegistration.findMany({
      where: { eventId, status: 'CONFIRMED' },
      orderBy: { createdAt: 'asc' },
    });

    // Buscar dados dos usuários inscritos
    const userIds = registrations.map((r) => r.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, phone: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return registrations.map((r) => ({
      ...r,
      user: userMap.get(r.userId) || null,
    }));
  }
}

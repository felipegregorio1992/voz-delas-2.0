import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  UseGuards, HttpCode, HttpStatus, Req, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permissions } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ── Rotas públicas (autenticadas) ─────────────────────────────────────────

  @Get('published')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar eventos publicados (App)' })
  async findPublished(@CurrentUser() user: any) {
    return this.eventsService.findPublishedForUser(user.id);
  }

  @Post('register/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inscrever-se em um evento' })
  async register(@CurrentUser() user: any, @Param('id') id: string) {
    return this.eventsService.register(id, user.id);
  }

  @Post('cancel-registration/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar inscrição em um evento' })
  async cancelRegistration(@CurrentUser() user: any, @Param('id') id: string) {
    return this.eventsService.cancelRegistration(id, user.id);
  }

  // ── Rotas admin ───────────────────────────────────────────────────────────

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('ANNOUNCEMENTS_MANAGE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todos os eventos (Admin)' })
  async findAll() {
    return this.eventsService.findAll();
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('ANNOUNCEMENTS_MANAGE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter evento por ID (Admin)' })
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Get('admin/:id/registrations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('ANNOUNCEMENTS_MANAGE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar inscritos de um evento (Admin)' })
  async getRegistrations(@Param('id') id: string) {
    return this.eventsService.getRegistrations(id);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('ANNOUNCEMENTS_MANAGE')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Criar evento (Admin)' })
  async create(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: any,
  ) {
    const body = request.body;

    if (!body.title || !String(body.title).trim()) {
      throw new BadRequestException('Título é obrigatório');
    }
    if (!body.category) {
      throw new BadRequestException('Categoria é obrigatória');
    }
    if (!body.startDate) {
      throw new BadRequestException('Data de início é obrigatória');
    }

    const dto = {
      title: String(body.title).trim(),
      category: body.category,
      description: body.description ? String(body.description).trim() : undefined,
      location: body.location ? String(body.location).trim() : undefined,
      startDate: body.startDate,
      endDate: body.endDate || undefined,
      startTime: body.startTime || undefined,
      endTime: body.endTime || undefined,
      maxSlots: body.maxSlots ? parseInt(body.maxSlots, 10) : undefined,
      isRecurring: body.isRecurring === 'true' || body.isRecurring === true,
      recurringDays: body.recurringDays || undefined,
      sector: body.sector || undefined,
      program: body.program || undefined,
    };

    return this.eventsService.create(dto, user.id, file);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('ANNOUNCEMENTS_MANAGE')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Atualizar evento (Admin)' })
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: any,
  ) {
    const body = request.body;
    const dto: any = {};

    if (body.title !== undefined) dto.title = String(body.title).trim();
    if (body.category !== undefined) dto.category = body.category;
    if (body.description !== undefined) dto.description = String(body.description).trim() || undefined;
    if (body.location !== undefined) dto.location = String(body.location).trim() || undefined;
    if (body.startDate !== undefined) dto.startDate = body.startDate;
    if (body.endDate !== undefined) dto.endDate = body.endDate || undefined;
    if (body.startTime !== undefined) dto.startTime = body.startTime || undefined;
    if (body.endTime !== undefined) dto.endTime = body.endTime || undefined;
    if (body.maxSlots !== undefined) dto.maxSlots = body.maxSlots ? parseInt(body.maxSlots, 10) : null;
    if (body.status !== undefined) dto.status = body.status;
    if (body.isRecurring !== undefined) dto.isRecurring = body.isRecurring === 'true' || body.isRecurring === true;
    if (body.recurringDays !== undefined) dto.recurringDays = body.recurringDays || undefined;
    if (body.sector !== undefined) dto.sector = body.sector || undefined;
    if (body.program !== undefined) dto.program = body.program || undefined;

    return this.eventsService.update(id, dto, file);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('ANNOUNCEMENTS_MANAGE')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir evento (Admin)' })
  async delete(@Param('id') id: string) {
    return this.eventsService.delete(id);
  }
}

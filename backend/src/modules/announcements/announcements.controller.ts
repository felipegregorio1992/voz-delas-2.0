import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permissions } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get('active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar banners e avisos ativos (App)' })
  async findActive(@CurrentUser() user: any) {
    return this.announcementsService.findActiveForApp(user.id);
  }

  @Post('dismiss/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dispensar um aviso (não mostrar mais)' })
  async dismiss(@CurrentUser() user: any, @Param('id') id: string) {
    return this.announcementsService.dismiss(id, user.id);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('ANNOUNCEMENTS_MANAGE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todos os anúncios (Admin)' })
  async findAll() {
    return this.announcementsService.findAll();
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('ANNOUNCEMENTS_MANAGE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter anúncio por ID (Admin)' })
  async findOne(@Param('id') id: string) {
    return this.announcementsService.findOne(id);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('ANNOUNCEMENTS_MANAGE')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Criar anúncio (Admin)' })
  async create(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: any,
  ) {
    const body = request.body;

    if (!body.title || !String(body.title).trim()) {
      throw new BadRequestException('Título é obrigatório');
    }
    if (!body.type || !['BANNER', 'NOTICE'].includes(body.type)) {
      throw new BadRequestException('Tipo deve ser BANNER ou NOTICE');
    }

    const dto = {
      title: String(body.title).trim(),
      type: body.type as 'BANNER' | 'NOTICE',
      content: body.content ? String(body.content).trim() : undefined,
      linkUrl: body.linkUrl ? String(body.linkUrl).trim() : undefined,
      isActive: body.isActive === 'false' || body.isActive === false ? false : true,
      startDate: body.startDate || undefined,
      endDate: body.endDate || undefined,
    };

    return this.announcementsService.create(dto, user.id, request, file);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('ANNOUNCEMENTS_MANAGE')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Atualizar anúncio (Admin)' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: any,
  ) {
    const body = request.body;
    const dto: any = {};

    if (body.title !== undefined) dto.title = String(body.title).trim();
    if (body.type !== undefined) {
      if (!['BANNER', 'NOTICE'].includes(body.type)) {
        throw new BadRequestException('Tipo deve ser BANNER ou NOTICE');
      }
      dto.type = body.type;
    }
    if (body.content !== undefined) dto.content = String(body.content).trim() || undefined;
    if (body.linkUrl !== undefined) dto.linkUrl = String(body.linkUrl).trim() || undefined;
    if (body.isActive !== undefined) {
      dto.isActive = body.isActive === 'false' || body.isActive === false ? false : true;
    }
    if (body.startDate !== undefined) dto.startDate = body.startDate || undefined;
    if (body.endDate !== undefined) dto.endDate = body.endDate || undefined;

    return this.announcementsService.update(id, dto, user.id, request, file);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('ANNOUNCEMENTS_MANAGE')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir anúncio (Admin)' })
  async delete(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() request: any,
  ) {
    return this.announcementsService.delete(id, user.id, request);
  }
}

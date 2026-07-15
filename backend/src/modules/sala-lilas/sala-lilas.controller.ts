import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SalaLilasService } from './sala-lilas.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { CreateAttendanceFormDto } from './dto/create-attendance-form.dto';
import { UpdateAttendanceFormDto } from './dto/update-attendance-form.dto';
import { CreateConsentTermDto } from './dto/create-consent-term.dto';
import { ClassifyRiskDto } from './dto/classify-risk.dto';
import { CreateReferralDto } from './dto/create-referral.dto';
import { ScheduleAttendanceDto } from './dto/schedule-attendance.dto';
import { ScheduleServiceType, SCHEDULE_SERVICE_LABELS } from './dto/schedule-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { CreateVideoSessionDto } from './dto/create-video-session.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permissions } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Sala Lilás Virtual')
@Controller('sala-lilas')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SalaLilasController {
  constructor(private readonly salaLilasService: SalaLilasService) {}

  // Atendimentos
  @Post('attendances')
  @ApiOperation({ summary: 'Criar novo atendimento' })
  async createAttendance(
    @Body() dto: CreateAttendanceDto,
    @CurrentUser() user: any,
    @Request() request: any,
  ) {
    return this.salaLilasService.createAttendance(dto, user.id, request);
  }

  @Get('attendances')
  @ApiOperation({ summary: 'Listar atendimentos com filtros' })
  async findAttendances(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: any,
  ) {
    return this.salaLilasService.findAttendances(
      user.id,
      user.permissions,
      status,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('attendances/active')
  @ApiOperation({ summary: 'Listar atendimentos ativos' })
  async findActiveAttendances(@CurrentUser() user: any) {
    return this.salaLilasService.findActiveAttendances(user.id, user.permissions);
  }

  @Get('service-types')
  @ApiOperation({ summary: 'Listar tipos de serviço disponíveis para agendamento' })
  getServiceTypes() {
    return Object.entries(SCHEDULE_SERVICE_LABELS).map(([value, label]) => ({
      value,
      label,
    }));
  }

  @Get('attendances/scheduled')
  @ApiOperation({ summary: 'Listar agendamentos futuros' })
  async getScheduledAttendances(@CurrentUser() user: any) {
    return this.salaLilasService.getScheduledAttendances(user.id, user.permissions);
  }

  @Patch('attendances/scheduled/:id/approve')
  @UseGuards(RolesGuard)
  @Permissions('SALA_LILAS_SCHEDULE_MANAGE')
  @ApiOperation({ summary: 'Aprovar agendamento (apenas atendentes/admin)' })
  async approveScheduledAttendance(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Request() request: any,
  ) {
    return this.salaLilasService.approveScheduledAttendance(id, user.id, user.permissions, request);
  }

  @Patch('attendances/scheduled/:id/reject')
  @UseGuards(RolesGuard)
  @Permissions('SALA_LILAS_SCHEDULE_MANAGE')
  @ApiOperation({ summary: 'Rejeitar agendamento (apenas atendentes/admin)' })
  async rejectScheduledAttendance(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Request() request: any,
  ) {
    return this.salaLilasService.rejectScheduledAttendance(id, user.id, user.permissions, request);
  }

  @Post('attendances/schedule/:clientId')
  @ApiOperation({ summary: 'Agendar atendimento futuro' })
  async scheduleAttendance(
    @Param('clientId') clientId: string,
    @Body() dto: ScheduleAttendanceDto,
    @CurrentUser() user: any,
    @Request() request: any,
  ) {
    return this.salaLilasService.scheduleAttendance(clientId, dto, user.id, request);
  }

  @Get('attendances/:id')
  @ApiOperation({ summary: 'Obter detalhes de um atendimento' })
  async findAttendanceById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.salaLilasService.findAttendanceById(id, user.id, user.permissions);
  }

  @Patch('attendances/:id')
  @UseGuards(RolesGuard)
  @Permissions('SALA_LILAS_ACCESS')
  @ApiOperation({ summary: 'Atualizar atendimento (apenas atendentes)' })
  async updateAttendance(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
    @CurrentUser() user: any,
    @Request() request: any,
  ) {
    return this.salaLilasService.updateAttendance(id, dto, user.id, user.permissions, request);
  }

  // Formulário de Acolhimento
  @Post('attendances/:attendanceId/form')
  @ApiOperation({ summary: 'Criar ou atualizar formulário de acolhimento' })
  async createOrUpdateForm(
    @Param('attendanceId') attendanceId: string,
    @Body() dto: CreateAttendanceFormDto | UpdateAttendanceFormDto,
    @CurrentUser() user: any,
    @Request() request: any,
  ) {
    return this.salaLilasService.createOrUpdateForm(attendanceId, dto, user.id, request);
  }

  @Get('attendances/:attendanceId/form')
  @ApiOperation({ summary: 'Obter formulário de acolhimento' })
  async getForm(
    @Param('attendanceId') attendanceId: string,
    @CurrentUser() user: any,
  ) {
    return this.salaLilasService.getForm(attendanceId, user.id, user.permissions);
  }

  // Termo de Consentimento
  @Post('attendances/:attendanceId/consent')
  @ApiOperation({ summary: 'Aceitar ou revogar termo de consentimento' })
  async createOrUpdateConsent(
    @Param('attendanceId') attendanceId: string,
    @Body() dto: CreateConsentTermDto,
    @CurrentUser() user: any,
    @Request() request: any,
  ) {
    return this.salaLilasService.createOrUpdateConsent(attendanceId, dto, user.id, request);
  }

  // Classificação de Risco
  @Post('attendances/:attendanceId/risk')
  @UseGuards(RolesGuard)
  @Permissions('SALA_LILAS_ACCESS')
  @ApiOperation({ summary: 'Classificar nível de risco (apenas atendentes)' })
  async classifyRisk(
    @Param('attendanceId') attendanceId: string,
    @Body() dto: ClassifyRiskDto,
    @CurrentUser() user: any,
    @Request() request: any,
  ) {
    return this.salaLilasService.classifyRisk(attendanceId, dto, user.id, user.permissions, request);
  }

  // Encaminhamentos
  @Post('attendances/:attendanceId/referrals')
  @UseGuards(RolesGuard)
  @Permissions('SALA_LILAS_ACCESS')
  @ApiOperation({ summary: 'Criar encaminhamento (apenas atendentes)' })
  async createReferral(
    @Param('attendanceId') attendanceId: string,
    @Body() dto: CreateReferralDto,
    @CurrentUser() user: any,
    @Request() request: any,
  ) {
    return this.salaLilasService.createReferral(attendanceId, dto, user.id, user.permissions, request);
  }

  @Get('attendances/:attendanceId/referrals')
  @ApiOperation({ summary: 'Listar encaminhamentos de um atendimento' })
  async getReferrals(
    @Param('attendanceId') attendanceId: string,
    @CurrentUser() user: any,
  ) {
    return this.salaLilasService.getReferrals(attendanceId, user.id, user.permissions);
  }

  // Painel Administrativo
  @Get('admin/indicators')
  @UseGuards(RolesGuard)
  @Permissions('SALA_LILAS_ACCESS')
  @ApiOperation({ summary: 'Obter indicadores quantitativos (apenas atendentes/admin)' })
  async getAdminIndicators(@CurrentUser() user: any) {
    return this.salaLilasService.getAdminIndicators(user.permissions);
  }

  // Sessões de Vídeo
  @Post('attendances/:attendanceId/video-session')
  @ApiOperation({ summary: 'Criar sessão de vídeo para um atendimento' })
  async createVideoSession(
    @Param('attendanceId') attendanceId: string,
    @Body() dto: { attendantId?: string },
    @CurrentUser() user: any,
    @Request() request: any,
  ) {
    try {
      return await this.salaLilasService.createVideoSession(attendanceId, dto.attendantId || user.id, user.id, user.permissions, request);
    } catch (error) {
      console.error('Erro no controller createVideoSession:', error);
      throw error;
    }
  }

  @Get('attendances/:attendanceId/video-session')
  @ApiOperation({ summary: 'Obter sessão de vídeo de um atendimento' })
  async getVideoSession(
    @Param('attendanceId') attendanceId: string,
    @CurrentUser() user: any,
  ) {
    return this.salaLilasService.getVideoSession(attendanceId, user.id, user.permissions);
  }

  @Post('attendances/:attendanceId/force-cleanup-video')
  @UseGuards(RolesGuard)
  @Permissions('ADMIN_PANEL')
  @ApiOperation({ summary: 'Forçar limpeza da sala de vídeo (apenas ADMIN)' })
  async forceCleanupVideo(
    @Param('attendanceId') attendanceId: string,
    @CurrentUser() user: any,
  ) {
    // FIX #12: Restrito a ADMIN — qualquer usuário autenticado não pode forçar limpeza
    return this.salaLilasService.forceCleanupVideoRoom(attendanceId, user.id);
  }

  @Post('video-sessions/:sessionId/start')
  @ApiOperation({ summary: 'Iniciar sessão de vídeo' })
  async startVideoSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: any,
    @Request() request: any,
  ) {
    return this.salaLilasService.startVideoSession(sessionId, user.id, user.permissions, request);
  }

  @Post('video-sessions/:sessionId/end')
  @ApiOperation({ summary: 'Encerrar sessão de vídeo' })
  async endVideoSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: any,
    @Request() request: any,
  ) {
    return this.salaLilasService.endVideoSession(sessionId, user.id, user.permissions, request);
  }
}

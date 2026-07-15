import { Injectable, NotFoundException, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { CreateAttendanceFormDto } from './dto/create-attendance-form.dto';
import { UpdateAttendanceFormDto } from './dto/update-attendance-form.dto';
import { CreateConsentTermDto } from './dto/create-consent-term.dto';
import { ClassifyRiskDto } from './dto/classify-risk.dto';
import { CreateReferralDto } from './dto/create-referral.dto';
import { ScheduleAttendanceDto } from './dto/schedule-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceStatus, ConsentStatus, VideoSessionStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { getIpFromRequest, getUserAgentFromRequest } from '../../common/utils/request-context.util';

@Injectable()
export class SalaLilasService {
  private readonly logger = new Logger(SalaLilasService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // Gateway será injetado via setter para evitar dependência circular
  private eventsGateway: any = null;

  private isSalaLilasStaff(userPermissions: string[]) {
    return Array.isArray(userPermissions) && userPermissions.includes('SALA_LILAS_ACCESS');
  }
  private chatGateway: any = null;
  private videoGateway: any = null;
  
  setEventsGateway(gateway: any) {
    this.eventsGateway = gateway;
  }
  
  setChatGateway(gateway: any) {
    this.chatGateway = gateway;
  }

  setVideoGateway(gateway: any) {
    this.videoGateway = gateway;
  }

  // Atendimentos
  async createAttendance(dto: CreateAttendanceDto, clientId: string, request: any) {
    const attendance = await this.prisma.attendance.create({
      data: {
        clientId,
        type: dto.type,
        status: AttendanceStatus.PENDING,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await this.auditService.log({
      userId: clientId,
      action: 'ATTENDANCE_CREATED',
      entity: 'Attendance',
      entityId: attendance.id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      detailsJson: JSON.stringify({ type: dto.type }),
    });

    this.logger.log(`[SALA LILAS] Atendimento criado: ${attendance.id} - Cliente: ${clientId}`);

    // Emitir evento de novo atendimento
    if (this.eventsGateway) {
      // Buscar dados completos do atendimento para enviar (mesmo formato que findActiveAttendances)
      const fullAttendance = await this.prisma.attendance.findUnique({
        where: { id: attendance.id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          form: {
            select: {
              isComplete: true,
            },
          },
          consentTerm: {
            select: {
              status: true,
            },
          },
        },
      });
      if (fullAttendance) {
        this.eventsGateway.emitNewAttendance(fullAttendance);
      }
    }

    return attendance;
  }

  async findAttendanceById(id: string, userId: string, userPermissions: string[]) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        attendant: {
          select: {
            id: true,
            name: true,
          },
        },
        form: true,
        consentTerm: true,
        riskClassifications: {
          orderBy: { classifiedAt: 'desc' },
          take: 1,
        },
        referrals: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    // Verificar permissões: cliente pode ver seu próprio atendimento, atendente pode ver todos
    const isClient = attendance.clientId === userId;
    const isStaff = this.isSalaLilasStaff(userPermissions);

    if (!isClient && !isStaff) {
      throw new ForbiddenException('Você não tem permissão para acessar este atendimento');
    }

    return attendance;
  }

  async findAttendances(
    userId: string,
    userPermissions: string[],
    status?: string,
    limit?: number,
  ) {
    const isStaff = this.isSalaLilasStaff(userPermissions);

    const where: any = {};

    // Filtro de status
    if (status) {
      where.status = status;
    }

    // Filtro de usuário (clientes veem apenas seus atendimentos)
    if (!isStaff) {
      where.clientId = userId;
    }

    return this.prisma.attendance.findMany({
      where,
      include: {
        client: isStaff
          ? {
              select: {
                id: true,
                name: true,
              },
            }
          : false,
        form: {
          select: {
            isComplete: true,
          },
        },
        consentTerm: {
          select: {
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit || 100,
    });
  }

  async findActiveAttendances(userId: string, userPermissions: string[]) {
    const isStaff = this.isSalaLilasStaff(userPermissions);

    if (isStaff) {
      // Staff vê todos os atendimentos ativos
      return this.prisma.attendance.findMany({
        where: {
          status: {
            in: [AttendanceStatus.PENDING, AttendanceStatus.IN_PROGRESS],
          },
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          form: {
            select: {
              isComplete: true,
            },
          },
          consentTerm: {
            select: {
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Clientes veem apenas seus próprios atendimentos ativos
      return this.prisma.attendance.findMany({
        where: {
          clientId: userId,
          status: {
            in: [AttendanceStatus.PENDING, AttendanceStatus.IN_PROGRESS],
          },
        },
        include: {
          form: {
            select: {
              isComplete: true,
            },
          },
          consentTerm: {
            select: {
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }
  }

  async updateAttendance(id: string, dto: UpdateAttendanceDto, userId: string, userPermissions: string[], request: any) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    // Apenas atendentes podem atualizar atendimentos
    const isStaff = this.isSalaLilasStaff(userPermissions);
    if (!isStaff) {
      throw new ForbiddenException('Apenas atendentes podem atualizar atendimentos');
    }

    const updateData: any = {};

    if (dto.status) {
      updateData.status = dto.status;
      if (dto.status === AttendanceStatus.IN_PROGRESS && !attendance.startedAt) {
        updateData.startedAt = new Date();
      }
      if (dto.status === AttendanceStatus.COMPLETED && !attendance.endedAt) {
        updateData.endedAt = new Date();
      }
    }

    if (dto.riskLevel) {
      updateData.riskLevel = dto.riskLevel;
    }

    if (dto.observations) {
      updateData.observations = dto.observations;
    }

    // Se não há atendente atribuído e o status é IN_PROGRESS, atribuir o atendente atual
    if (dto.status === AttendanceStatus.IN_PROGRESS && !attendance.attendantId) {
      updateData.attendantId = userId;
    }

    const updated = await this.prisma.attendance.update({
      where: { id },
      data: updateData,
    });

    await this.auditService.log({
      userId,
      action: 'ATTENDANCE_UPDATED',
      entity: 'Attendance',
      entityId: id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      detailsJson: JSON.stringify(dto),
    });

    this.logger.log(`[SALA LILAS] Atendimento atualizado: ${id} - User: ${userId}`);

    // Emitir evento de atualização de atendimento
    if (this.eventsGateway) {
      const fullAttendance = await this.prisma.attendance.findUnique({
        where: { id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          form: {
            select: {
              isComplete: true,
            },
          },
          consentTerm: {
            select: {
              status: true,
            },
          },
        },
      });
      if (fullAttendance) {
        // Se foi concluído ou cancelado, remover da lista
        if (fullAttendance.status === 'COMPLETED' || fullAttendance.status === 'CANCELLED') {
          this.eventsGateway.emitAttendanceRemoved(id);
        } else {
          this.eventsGateway.emitAttendanceUpdate(fullAttendance);
        }
      }
    }

    return updated;
  }

  // Formulário de Acolhimento
  async createOrUpdateForm(attendanceId: string, dto: CreateAttendanceFormDto | UpdateAttendanceFormDto, userId: string, request: any) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    // Apenas o cliente pode criar/atualizar o formulário
    if (attendance.clientId !== userId) {
      throw new ForbiddenException('Apenas o cliente pode preencher o formulário');
    }

    const existingForm = await this.prisma.attendanceForm.findUnique({
      where: { attendanceId },
    });

    let form;
    if (existingForm) {
      form = await this.prisma.attendanceForm.update({
        where: { attendanceId },
        data: {
          formData: dto.formData || existingForm.formData,
          isComplete: dto.isComplete !== undefined ? dto.isComplete : existingForm.isComplete,
          completedAt: dto.isComplete === true && !existingForm.isComplete ? new Date() : existingForm.completedAt,
        },
      });
    } else {
      form = await this.prisma.attendanceForm.create({
        data: {
          attendanceId,
          formData: dto.formData,
          isComplete: dto.isComplete || false,
          completedAt: dto.isComplete ? new Date() : null,
        },
      });
    }

    await this.auditService.log({
      userId,
      action: existingForm ? 'ATTENDANCE_FORM_UPDATED' : 'ATTENDANCE_FORM_CREATED',
      entity: 'AttendanceForm',
      entityId: form.id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
    });

    return form;
  }

  async getForm(attendanceId: string, userId: string, userPermissions: string[]) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    const isClient = attendance.clientId === userId;
    const isStaff = this.isSalaLilasStaff(userPermissions);

    if (!isClient && !isStaff) {
      throw new ForbiddenException('Você não tem permissão para acessar este formulário');
    }

    const form = await this.prisma.attendanceForm.findUnique({
      where: { attendanceId },
    });

    return form;
  }

  // Termo de Consentimento
  async createOrUpdateConsent(attendanceId: string, dto: CreateConsentTermDto, userId: string, request: any) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    // Apenas o cliente pode aceitar/revogar o consentimento
    if (attendance.clientId !== userId) {
      throw new ForbiddenException('Apenas o cliente pode gerenciar o consentimento');
    }

    const existingConsent = await this.prisma.consentTerm.findUnique({
      where: { attendanceId },
    });

    let consent;
    if (existingConsent) {
      const updateData: any = {
        status: dto.status,
      };

      if (dto.status === ConsentStatus.ACCEPTED && existingConsent.status !== ConsentStatus.ACCEPTED) {
        updateData.acceptedAt = new Date();
        updateData.revokedAt = null;
      } else if (dto.status === ConsentStatus.REVOKED && existingConsent.status !== ConsentStatus.REVOKED) {
        updateData.revokedAt = new Date();
      }

      consent = await this.prisma.consentTerm.update({
        where: { attendanceId },
        data: updateData,
      });
    } else {
      consent = await this.prisma.consentTerm.create({
        data: {
          attendanceId,
          status: dto.status,
          acceptedAt: dto.status === ConsentStatus.ACCEPTED ? new Date() : null,
          ipAddress: getIpFromRequest(request),
          userAgent: getUserAgentFromRequest(request),
        },
      });
    }

    await this.auditService.log({
      userId,
      action: 'CONSENT_TERM_UPDATED',
      entity: 'ConsentTerm',
      entityId: consent.id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      detailsJson: JSON.stringify({ status: dto.status }),
    });

    return consent;
  }

  // Classificação de Risco
  async classifyRisk(attendanceId: string, dto: ClassifyRiskDto, userId: string, userPermissions: string[], request: any) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    // Apenas atendentes podem classificar risco
    const isStaff = this.isSalaLilasStaff(userPermissions);
    if (!isStaff) {
      throw new ForbiddenException('Apenas atendentes podem classificar risco');
    }

    // Criar classificação de risco
    const riskClassification = await this.prisma.riskClassification.create({
      data: {
        attendanceId,
        riskLevel: dto.riskLevel,
        notes: dto.notes,
        classifiedBy: userId,
      },
    });

    // Atualizar nível de risco no atendimento
    await this.prisma.attendance.update({
      where: { id: attendanceId },
      data: { riskLevel: dto.riskLevel },
    });

    await this.auditService.log({
      userId,
      action: 'RISK_CLASSIFIED',
      entity: 'RiskClassification',
      entityId: riskClassification.id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      detailsJson: JSON.stringify({ riskLevel: dto.riskLevel }),
    });

    return riskClassification;
  }

  // Encaminhamentos
  async createReferral(attendanceId: string, dto: CreateReferralDto, userId: string, userPermissions: string[], request: any) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    // Apenas atendentes podem criar encaminhamentos
    const isStaff = this.isSalaLilasStaff(userPermissions);
    if (!isStaff) {
      throw new ForbiddenException('Apenas atendentes podem criar encaminhamentos');
    }

    const service = await this.prisma.supportService.findUnique({
      where: { id: dto.serviceId },
    });

    if (!service) {
      throw new NotFoundException('Serviço de apoio não encontrado');
    }

    if (!service.isActive) {
      throw new BadRequestException('Serviço de apoio não está ativo');
    }

    const referral = await this.prisma.referral.create({
      data: {
        attendanceId,
        serviceId: dto.serviceId,
        referredBy: userId,
        notes: dto.notes,
      },
      include: {
        service: true,
      },
    });

    await this.auditService.log({
      userId,
      action: 'REFERRAL_CREATED',
      entity: 'Referral',
      entityId: referral.id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      detailsJson: JSON.stringify({ serviceId: dto.serviceId }),
    });

    return referral;
  }

  async getReferrals(attendanceId: string, userId: string, userPermissions: string[]) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    const isClient = attendance.clientId === userId;
    const isStaff = this.isSalaLilasStaff(userPermissions);

    if (!isClient && !isStaff) {
      throw new ForbiddenException('Você não tem permissão para acessar os encaminhamentos');
    }

    return this.prisma.referral.findMany({
      where: { attendanceId },
      include: {
        service: true,
        referrer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Agendamentos
  async scheduleAttendance(clientId: string, dto: ScheduleAttendanceDto, userId: string, request: any) {
    // Cliente pode agendar para si mesmo, atendente pode agendar para qualquer cliente
    if (userId !== clientId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const userPermissions = Array.from(
        new Set<string>(
          (user?.userRoles || [])
            .flatMap((ur) => ur.role.rolePermissions)
            .map((rp) => rp.permission.code),
        ),
      );

      if (!this.isSalaLilasStaff(userPermissions)) {
        throw new ForbiddenException('Você não tem permissão para agendar atendimentos para outros usuários');
      }
    }

    const scheduledAttendance = await this.prisma.scheduledAttendance.create({
      data: {
        clientId,
        attendantId: dto.attendantId,
        scheduledFor: new Date(dto.scheduledFor),
        serviceType: dto.serviceType || null,
        notes: dto.notes,
        status: 'PENDING',
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        attendant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await this.auditService.log({
      userId,
      action: 'ATTENDANCE_SCHEDULED',
      entity: 'ScheduledAttendance',
      entityId: scheduledAttendance.id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      detailsJson: JSON.stringify({ scheduledFor: dto.scheduledFor }),
    });

    if (this.eventsGateway) {
      this.eventsGateway.emitScheduleCreated(scheduledAttendance);
    }

    return scheduledAttendance;
  }

  async getScheduledAttendances(userId: string, userPermissions: string[]) {
    const isStaff = this.isSalaLilasStaff(userPermissions);

    // Início do dia de hoje (meia-noite) para incluir todos os agendamentos do dia atual
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const visibleStatuses = ['PENDING', 'APPROVED'];

    if (isStaff) {
      return this.prisma.scheduledAttendance.findMany({
        where: {
          status: { in: visibleStatuses },
          scheduledFor: {
            gte: startOfToday,
          },
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          attendant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { scheduledFor: 'asc' },
      });
    } else {
      return this.prisma.scheduledAttendance.findMany({
        where: {
          clientId: userId,
          status: { in: visibleStatuses },
          scheduledFor: {
            gte: startOfToday,
          },
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          attendant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { scheduledFor: 'asc' },
      });
    }
  }

  async approveScheduledAttendance(id: string, userId: string, userPermissions: string[], request: any) {
    if (!Array.isArray(userPermissions) || !userPermissions.includes('SALA_LILAS_SCHEDULE_MANAGE')) {
      throw new ForbiddenException('Apenas atendentes podem aprovar agendamentos');
    }

    const scheduled = await this.prisma.scheduledAttendance.findUnique({
      where: { id },
    });

    if (!scheduled) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    if (scheduled.status !== 'PENDING') {
      throw new BadRequestException('Agendamento não está pendente');
    }

    const updated = await this.prisma.scheduledAttendance.update({
      where: { id },
      data: {
        status: 'APPROVED',
        attendantId: scheduled.attendantId || userId,
      },
      include: {
        client: { select: { id: true, name: true } },
        attendant: { select: { id: true, name: true } },
      },
    });

    await this.auditService.log({
      userId,
      action: 'SCHEDULE_APPROVED',
      entity: 'ScheduledAttendance',
      entityId: updated.id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      detailsJson: JSON.stringify({ scheduledFor: updated.scheduledFor }),
    });

    if (this.eventsGateway) {
      this.eventsGateway.emitScheduleUpdated(updated);
    }

    return updated;
  }

  async rejectScheduledAttendance(id: string, userId: string, userPermissions: string[], request: any) {
    if (!Array.isArray(userPermissions) || !userPermissions.includes('SALA_LILAS_SCHEDULE_MANAGE')) {
      throw new ForbiddenException('Apenas atendentes podem rejeitar agendamentos');
    }

    const scheduled = await this.prisma.scheduledAttendance.findUnique({
      where: { id },
    });

    if (!scheduled) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    if (scheduled.status !== 'PENDING') {
      throw new BadRequestException('Agendamento não está pendente');
    }

    const updated = await this.prisma.scheduledAttendance.update({
      where: { id },
      data: {
        status: 'REJECTED',
        attendantId: scheduled.attendantId || userId,
      },
      include: {
        client: { select: { id: true, name: true } },
        attendant: { select: { id: true, name: true } },
      },
    });

    await this.auditService.log({
      userId,
      action: 'SCHEDULE_REJECTED',
      entity: 'ScheduledAttendance',
      entityId: updated.id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      detailsJson: JSON.stringify({ scheduledFor: updated.scheduledFor }),
    });

    if (this.eventsGateway) {
      this.eventsGateway.emitScheduleUpdated(updated);
    }

    return updated;
  }

  // Painel Administrativo - Indicadores
  async getAdminIndicators(userPermissions: string[]) {
    const isStaff = this.isSalaLilasStaff(userPermissions);
    if (!isStaff) {
      throw new ForbiddenException('Apenas administradores e atendentes podem acessar os indicadores');
    }

    const [
      totalAttendances,
      activeAttendances,
      completedAttendances,
      pendingAttendances,
      totalForms,
      completedForms,
      totalReferrals,
      totalScheduled,
    ] = await Promise.all([
      this.prisma.attendance.count(),
      this.prisma.attendance.count({
        where: { status: AttendanceStatus.IN_PROGRESS },
      }),
      this.prisma.attendance.count({
        where: { status: AttendanceStatus.COMPLETED },
      }),
      this.prisma.attendance.count({
        where: { status: AttendanceStatus.PENDING },
      }),
      this.prisma.attendanceForm.count(),
      this.prisma.attendanceForm.count({
        where: { isComplete: true },
      }),
      this.prisma.referral.count(),
      this.prisma.scheduledAttendance.count({
        where: {
          status: 'PENDING',
          scheduledFor: { gte: new Date() },
        },
      }),
    ]);

    return {
      totalAttendances,
      activeAttendances,
      completedAttendances,
      pendingAttendances,
      totalForms,
      completedForms,
      totalReferrals,
      totalScheduled,
    };
  }

  // Sessões de Vídeo
  async createVideoSession(attendanceId: string, attendantId: string, userId: string, userPermissions: string[], request: any) {
    try {
      this.logger.log(`[SALA LILAS] Criando sessão de vídeo - Attendance: ${attendanceId}, User: ${userId}`);
      
      const attendance = await this.prisma.attendance.findUnique({
        where: { id: attendanceId },
      });

      if (!attendance) {
        throw new NotFoundException('Atendimento não encontrado');
      }

    // Verificar permissões
    const isClient = attendance.clientId === userId;
    const isStaff = this.isSalaLilasStaff(userPermissions);

    if (!isClient && !isStaff) {
      throw new ForbiddenException('Você não tem permissão para criar sessão de vídeo');
    }

    // Se for cliente, usar o attendantId fornecido; se for atendente, usar o próprio ID
    const finalAttendantId = isStaff ? userId : attendantId;

    if (!finalAttendantId) {
      throw new BadRequestException('ID do atendente é obrigatório');
    }

    // Verificar se já existe uma sessão ativa
    const existingSession = await this.prisma.videoSession.findFirst({
      where: {
        attendanceId,
        status: VideoSessionStatus.ACTIVE,
      },
    });

    if (existingSession) {
      throw new BadRequestException('Já existe uma sessão de vídeo ativa para este atendimento');
    }

    // Criar sessão de vídeo
    const videoSession = await this.prisma.videoSession.create({
      data: {
        attendanceId,
        clientId: attendance.clientId,
        attendantId: finalAttendantId,
        status: VideoSessionStatus.PENDING,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        attendant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await this.auditService.log({
      userId,
      action: 'VIDEO_SESSION_CREATED',
      entity: 'VideoSession',
      entityId: videoSession.id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      detailsJson: JSON.stringify({ attendanceId, attendantId: finalAttendantId }),
    });

    this.logger.log(`[SALA LILAS] Sessão de vídeo criada: ${videoSession.id} - Attendance: ${attendanceId}`);

    return videoSession;
    } catch (error) {
      this.logger.error(`[SALA LILAS] Erro ao criar sessão de vídeo: ${error.message}`);
      this.logger.error(`[SALA LILAS] Stack trace: ${error.stack}`);
      throw error;
    }
  }

  async startVideoSession(sessionId: string, userId: string, userPermissions: string[], request: any) {
    const session = await this.prisma.videoSession.findUnique({
      where: { id: sessionId },
      include: {
        attendance: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Sessão de vídeo não encontrada');
    }

    // Verificar permissões
    const isClient = session.clientId === userId;
    const isStaff = this.isSalaLilasStaff(userPermissions);
    const isAttendant = session.attendantId === userId || isStaff;

    if (!isClient && !isAttendant) {
      throw new ForbiddenException('Você não tem permissão para iniciar esta sessão');
    }

    if (session.status !== VideoSessionStatus.PENDING) {
      throw new BadRequestException('Sessão já foi iniciada ou encerrada');
    }

    // Atualizar sessão
    const updated = await this.prisma.videoSession.update({
      where: { id: sessionId },
      data: {
        status: VideoSessionStatus.ACTIVE,
        startedAt: new Date(),
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        attendant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await this.auditService.log({
      userId,
      action: 'VIDEO_SESSION_STARTED',
      entity: 'VideoSession',
      entityId: sessionId,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
    });

    this.logger.log(`[SALA LILAS] Sessão de vídeo iniciada: ${sessionId}`);

    // Emitir evento de videochamada iniciada para os clientes conectados ao chat
    try {
      if (this.chatGateway) {
        this.chatGateway.emitVideoCallStarted(updated.attendanceId, updated);
        this.logger.log(`[SALA LILAS] Evento de videochamada emitido: ${sessionId}`);
      } else {
        this.logger.warn(`[SALA LILAS] ChatGateway não está disponível para emitir evento de videochamada`);
      }
    } catch (error) {
      this.logger.error(`[SALA LILAS] Erro ao emitir evento de videochamada: ${error.message}`);
      // Não falhar a requisição se houver erro ao emitir evento
    }

    return updated;
  }

  async endVideoSession(sessionId: string, userId: string, userPermissions: string[], request: any) {
    const session = await this.prisma.videoSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Sessão de vídeo não encontrada');
    }

    // Verificar permissões
    const isClient = session.clientId === userId;
    const isStaff = this.isSalaLilasStaff(userPermissions);
    const isAttendant = session.attendantId === userId || isStaff;

    if (!isClient && !isAttendant) {
      throw new ForbiddenException('Você não tem permissão para encerrar esta sessão');
    }

    if (session.status === VideoSessionStatus.ENDED || session.status === VideoSessionStatus.CANCELLED) {
      throw new BadRequestException('Sessão já foi encerrada');
    }

    // Atualizar sessão
    const updated = await this.prisma.videoSession.update({
      where: { id: sessionId },
      data: {
        status: VideoSessionStatus.ENDED,
        endedAt: new Date(),
      },
    });

    await this.auditService.log({
      userId,
      action: 'VIDEO_SESSION_ENDED',
      entity: 'VideoSession',
      entityId: sessionId,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
    });

    this.logger.log(`[SALA LILAS] Sessão de vídeo encerrada: ${sessionId}`);

    return updated;
  }

  async getVideoSession(attendanceId: string, userId: string, userPermissions: string[]) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    const isClient = attendance.clientId === userId;
    const isStaff = this.isSalaLilasStaff(userPermissions);

    if (!isClient && !isStaff) {
      throw new ForbiddenException('Você não tem permissão para acessar esta sessão');
    }

    const session = await this.prisma.videoSession.findFirst({
      where: {
        attendanceId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        attendant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return session;
  }

  async forceCleanupVideoRoom(attendanceId: string, userId: string) {
    this.logger.warn(`[SALA LILAS] Forçando limpeza da sala de vídeo: ${attendanceId} - Solicitado por: ${userId}`);
    
    // 1. Limpar no Gateway (memória)
    if (this.videoGateway) {
      this.videoGateway.forceClearRoom(attendanceId);
    } else {
      this.logger.warn('[SALA LILAS] VideoGateway não injetado. Não foi possível limpar a sala em memória.');
    }

    // 2. Marcar sessões antigas como encerradas no banco
    await this.prisma.videoSession.updateMany({
      where: {
        attendanceId,
        status: VideoSessionStatus.ACTIVE,
      },
      data: {
        status: VideoSessionStatus.ENDED,
        endedAt: new Date(),
      },
    });

    return { success: true, message: 'Sala limpa com sucesso' };
  }
}

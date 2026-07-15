import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PanicService } from './panic.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PanicStatus } from '@prisma/client';

describe('PanicService', () => {
  let service: PanicService;
  let prisma: PrismaService;

  const mockPrismaService = {
    panicEvent: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    panicLocation: {
      create: jest.fn(),
    },
    trustedContact: {
      findMany: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockIntegrationsService = {
    enqueuePanicIntegration: jest.fn(),
  };

  const mockNotificationsService = {
    sendPanicNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PanicService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: IntegrationsService, useValue: mockIntegrationsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<PanicService>(PanicService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar evento de pânico com sucesso', async () => {
      const userId = 'user-id';

      mockPrismaService.panicEvent.findFirst.mockResolvedValue(null);
      mockPrismaService.panicEvent.create.mockResolvedValue({
        id: 'panic-id',
        userId,
        status: PanicStatus.ACTIVE,
        locations: [],
      });
      mockPrismaService.trustedContact.findMany.mockResolvedValue([]);
      mockIntegrationsService.enqueuePanicIntegration.mockResolvedValue([]);

      const result = await service.create(userId, {});

      expect(result).toHaveProperty('id');
      expect(result.status).toBe(PanicStatus.ACTIVE);
    });

    it('deve lançar erro se já existe pânico ativo', async () => {
      const userId = 'user-id';

      mockPrismaService.panicEvent.findFirst.mockResolvedValue({
        id: 'existing-panic',
        status: PanicStatus.ACTIVE,
      });

      await expect(service.create(userId, {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('end', () => {
    it('deve encerrar evento de pânico com sucesso', async () => {
      const userId = 'user-id';
      const panicEventId = 'panic-id';

      mockPrismaService.panicEvent.findUnique.mockResolvedValue({
        id: panicEventId,
        userId,
        status: PanicStatus.ACTIVE,
      });
      mockPrismaService.panicEvent.update.mockResolvedValue({
        id: panicEventId,
        status: PanicStatus.ENDED,
        endedAt: new Date(),
      });

      const result = await service.end(panicEventId, userId, {});

      expect(result.status).toBe(PanicStatus.ENDED);
    });
  });
});


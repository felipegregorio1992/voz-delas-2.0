import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TrustedContactsService } from './trusted-contacts.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('TrustedContactsService', () => {
  let service: TrustedContactsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    trustedContact: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrustedContactsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<TrustedContactsService>(TrustedContactsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar contato de confiança quando há menos de 3', async () => {
      const userId = 'user-id';
      const dto = {
        name: 'João Silva',
        phone: '+5511999999999',
        relationship: 'Familiar',
      };

      mockPrismaService.trustedContact.count.mockResolvedValue(2);
      mockPrismaService.trustedContact.create.mockResolvedValue({
        id: 'contact-id',
        ...dto,
        userId,
      });

      const result = await service.create(userId, dto, {});

      expect(result).toHaveProperty('id');
      expect(mockPrismaService.trustedContact.create).toHaveBeenCalled();
    });

    it('deve lançar erro quando já existem 3 contatos', async () => {
      const userId = 'user-id';
      const dto = {
        name: 'João Silva',
        phone: '+5511999999999',
      };

      mockPrismaService.trustedContact.count.mockResolvedValue(3);

      await expect(service.create(userId, dto, {})).rejects.toThrow(BadRequestException);
    });
  });
});


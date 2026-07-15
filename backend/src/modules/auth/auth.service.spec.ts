import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_ACCESS_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key];
    }),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('deve criar um novo usuário com sucesso', async () => {
      const dto = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+5511999999999',
        password: 'password123',
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-id',
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        userRoles: [{ role: { name: 'USER' } }],
      });
      mockJwtService.sign.mockReturnValue('token');

      const result = await service.register(dto, {});

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('deve lançar erro se email já existe', async () => {
      const dto = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'password123',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(service.register(dto, {})).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('deve fazer login com sucesso', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-id',
        email: dto.email,
        passwordHash: 'hashed-password',
        isActive: true,
        userRoles: [{ role: { name: 'USER' } }],
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('token');

      const result = await service.login(dto, {});

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
    });

    it('deve lançar erro se credenciais inválidas', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.login(dto, {})).rejects.toThrow(UnauthorizedException);
    });
  });
});


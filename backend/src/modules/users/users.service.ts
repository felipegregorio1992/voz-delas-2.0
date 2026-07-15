import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
                rolePermissions: {
                  select: {
                    permission: {
                      select: {
                        code: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(
        user.userRoles
          .flatMap((ur) => ur.role.rolePermissions)
          .map((rp) => rp.permission.code),
      ),
    );

    const { userRoles, ...rest } = user;
    return {
      ...rest,
      roles,
      permissions,
    };
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    // FIX #12: Verificar unicidade de email/phone antes de atualizar.
    // Sem isso, o erro do Prisma (P2002) vaza que o email já existe.
    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id: userId } },
        select: { id: true },
      });
      if (existing) {
        // Mensagem genérica — não confirmar se o email pertence a outro usuário
        throw new ConflictException('Não foi possível atualizar os dados. Tente outro email.');
      }
    }

    if (dto.phone) {
      const existing = await this.prisma.user.findFirst({
        where: { phone: dto.phone, NOT: { id: userId } },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('Não foi possível atualizar os dados. Tente outro telefone.');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.email && { email: dto.email }),
        ...(dto.phone && { phone: dto.phone }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }
}


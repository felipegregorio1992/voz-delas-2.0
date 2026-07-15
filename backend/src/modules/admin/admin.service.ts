import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async listUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        userRoles: {
          include: { role: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      ...u,
      roles: u.userRoles.map((ur) => ur.role.name),
      roleIds: u.userRoles.map((ur) => ur.role.id),
      userRoles: undefined,
    }));
  }

  async createUser(dto: {
    name: string;
    email?: string;
    phone?: string;
    password: string;
    roleIds: string[];
  }) {
    // Verificar duplicidade
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing) throw new ConflictException('Email já cadastrado');
    }
    if (dto.phone) {
      const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (existing) throw new ConflictException('Telefone já cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await (this.prisma.user.create as any)({
      data: {
        name: dto.name,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        passwordHash,
      },
    });

    // Marcar como conta WEB via raw query (Prisma client ainda não tem o campo source)
    await this.prisma.$executeRawUnsafe(
      `UPDATE users SET source = 'WEB' WHERE id = ?`,
      user.id,
    );

    // Atribuir cargos
    for (const roleId of dto.roleIds) {
      const role = await this.prisma.role.findUnique({ where: { id: roleId } });
      if (!role) throw new NotFoundException('Cargo não encontrado');
      await this.prisma.userRole.create({
        data: { userId: user.id, roleId },
      });
    }

    return { id: user.id, name: user.name, email: user.email, roleIds: dto.roleIds };
  }

  async updateUserRoles(userId: string, roleIds: string[]) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    // Remover roles atuais
    await this.prisma.userRole.deleteMany({ where: { userId } });

    // Adicionar novos cargos
    for (const roleId of roleIds) {
      const role = await this.prisma.role.findUnique({ where: { id: roleId } });
      if (!role) throw new NotFoundException('Cargo não encontrado');
      await this.prisma.userRole.create({
        data: { userId, roleId },
      });
    }

    return { userId, roleIds };
  }

  async toggleUserActive(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: { id: true, name: true, isActive: true },
    });
  }

  async listPermissions() {
    return this.prisma.permission.findMany({
      select: { id: true, code: true, label: true, description: true },
      orderBy: { code: 'asc' },
    });
  }

  async listRoles() {
    const roles = await this.prisma.role.findMany({
      select: {
        id: true,
        name: true,
        rolePermissions: {
          select: {
            permission: {
              select: {
                code: true,
                label: true,
                description: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      permissionCodes: r.rolePermissions.map((rp) => rp.permission.code),
      permissions: r.rolePermissions.map((rp) => rp.permission),
    }));
  }

  async createRole(dto: { name: string; permissionCodes: string[] }) {
    const existing = await this.prisma.role.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Já existe um cargo com este nome');

    const permissions = dto.permissionCodes.length
      ? await this.prisma.permission.findMany({
          where: { code: { in: dto.permissionCodes } },
          select: { id: true, code: true },
        })
      : [];

    if (permissions.length !== dto.permissionCodes.length) {
      throw new NotFoundException('Uma ou mais permissões não foram encontradas');
    }

    const role = await this.prisma.role.create({
      data: { name: dto.name },
    });

    if (permissions.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissions.map((p) => ({
          roleId: role.id,
          permissionId: p.id,
        })),
        skipDuplicates: true,
      });
    }

    return { id: role.id, name: role.name, permissionCodes: dto.permissionCodes };
  }

  async updateRole(roleId: string, dto: { name: string; permissionCodes: string[] }) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Cargo não encontrado');

    if (dto.name !== role.name) {
      const existing = await this.prisma.role.findUnique({ where: { name: dto.name } });
      if (existing && existing.id !== roleId) {
        throw new ConflictException('Já existe um cargo com este nome');
      }
    }

    const permissions = dto.permissionCodes.length
      ? await this.prisma.permission.findMany({
          where: { code: { in: dto.permissionCodes } },
          select: { id: true, code: true },
        })
      : [];

    if (permissions.length !== dto.permissionCodes.length) {
      throw new NotFoundException('Uma ou mais permissões não foram encontradas');
    }

    await this.prisma.role.update({
      where: { id: roleId },
      data: { name: dto.name },
    });

    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    if (permissions.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissions.map((p) => ({
          roleId,
          permissionId: p.id,
        })),
        skipDuplicates: true,
      });
    }

    return { id: roleId, name: dto.name, permissionCodes: dto.permissionCodes };
  }
}


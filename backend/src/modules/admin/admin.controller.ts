import {
  Controller, Get, Post, Patch, Body, Param,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsArray, MinLength, ArrayNotEmpty } from 'class-validator';
import { IncidentsService } from '../incidents/incidents.service';
import { PanicService } from '../panic/panic.service';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permissions } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class CreateUserDto {
  @IsString() name: string;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @MinLength(6) password: string;
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roleIds: string[];
}

class UpdateRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roleIds: string[];
}

class UpsertRoleDto {
  @IsString() name: string;
  @IsArray()
  @IsString({ each: true })
  permissionCodes: string[];
}

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Permissions('ADMIN_PANEL')
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly incidentsService: IncidentsService,
    private readonly panicService: PanicService,
    private readonly adminService: AdminService,
  ) {}

  // ── Dados do dashboard ────────────────────────────────────────────────────

  @Get('incidents')
  @Permissions('INCIDENTS_VIEW')
  @ApiOperation({ summary: 'Listar todas as denúncias (Admin)' })
  async getAllIncidents() {
    // Query direta — não passa por findAllForAdmin que tem filtro de role legado
    return await this.incidentsService.findAllForAdminDirect();
  }

  @Get('panic')
  @Permissions('PANIC_VIEW')
  @ApiOperation({ summary: 'Listar todos os eventos de pânico (Admin)' })
  async getAllPanicEvents() {
    return await this.panicService.findAllForAdmin();
  }

  @Get('panic/active')
  @Permissions('PANIC_VIEW')
  @ApiOperation({ summary: 'Listar eventos de pânico ativos (Admin)' })
  async getActivePanicEvents() {
    return await this.panicService.findActiveForAdmin();
  }

  // ── Gestão de usuários (apenas ADMIN) ────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'Listar todos os usuários do sistema' })
  async listUsers() {
    return this.adminService.listUsers();
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo usuário com cargos' })
  async createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Patch('users/:id/roles')
  @ApiOperation({ summary: 'Atualizar cargos de um usuário' })
  async updateRoles(@Param('id') id: string, @Body() dto: UpdateRolesDto) {
    return this.adminService.updateUserRoles(id, dto.roleIds);
  }

  @Patch('users/:id/toggle-active')
  @ApiOperation({ summary: 'Ativar/desativar usuário' })
  async toggleActive(@Param('id') id: string) {
    return this.adminService.toggleUserActive(id);
  }

  // ── Permissões e Cargos ───────────────────────────────────────────────────

  @Get('permissions')
  @ApiOperation({ summary: 'Listar catálogo de permissões' })
  async listPermissions() {
    return this.adminService.listPermissions();
  }

  @Get('roles')
  @ApiOperation({ summary: 'Listar cargos (com permissões)' })
  async listRoles() {
    return this.adminService.listRoles();
  }

  @Post('roles')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar cargo (com permissões)' })
  async createRole(@Body() dto: UpsertRoleDto) {
    return this.adminService.createRole(dto);
  }

  @Patch('roles/:id')
  @ApiOperation({ summary: 'Atualizar cargo (nome e permissões)' })
  async updateRole(@Param('id') id: string, @Body() dto: UpsertRoleDto) {
    return this.adminService.updateRole(id, dto);
  }
}


import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupportNetworkService } from './support-network.service';
import { CreateSupportServiceDto } from './dto/create-support-service.dto';
import { UpdateSupportServiceDto } from './dto/update-support-service.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permissions } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Support Network')
@Controller('support-services')
export class SupportNetworkController {
  constructor(private readonly supportNetworkService: SupportNetworkService) {}

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Listar serviços de apoio (público)' })
  async findAllPublic() {
    return this.supportNetworkService.findAllActive();
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar serviços de apoio' })
  async findAll() {
    return this.supportNetworkService.findAll();
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('SUPPORT_SERVICES_MANAGE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todos os serviços (Admin)' })
  async findAllForAdmin() {
    return this.supportNetworkService.findAll();
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('SUPPORT_SERVICES_MANAGE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter serviço por ID (Admin)' })
  async findOne(@Param('id') id: string) {
    return this.supportNetworkService.findOne(id);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('SUPPORT_SERVICES_MANAGE')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar serviço de apoio (Admin)' })
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateSupportServiceDto,
    @Request() request,
  ) {
    return this.supportNetworkService.create(dto, user.id, request);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('SUPPORT_SERVICES_MANAGE')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar serviço de apoio (Admin)' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateSupportServiceDto,
    @Request() request,
  ) {
    return this.supportNetworkService.update(id, dto, user.id, request);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('SUPPORT_SERVICES_MANAGE')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir serviço de apoio (Admin)' })
  async delete(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Request() request,
  ) {
    return this.supportNetworkService.delete(id, user.id, request);
  }
}


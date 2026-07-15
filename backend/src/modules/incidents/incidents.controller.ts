import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permissions } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Incidents')
@Controller('incidents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar denúncia' })
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateIncidentDto,
    @Request() request,
  ) {
    return this.incidentsService.create(user.id, dto, request);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter denúncia por ID' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.incidentsService.findOne(id, user.id, user.permissions);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Permissions('INCIDENTS_VIEW')
  @ApiOperation({ summary: 'Listar todas as denúncias (Admin)' })
  async findAllForAdmin(@CurrentUser() user: any) {
    return this.incidentsService.findAllForAdmin(user.permissions);
  }
}


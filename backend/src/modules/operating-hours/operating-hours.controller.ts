import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OperatingHoursService } from './operating-hours.service';
import { UpsertOperatingHoursDto } from './dto/upsert-operating-hours.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permissions } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Horários de Funcionamento')
@Controller('operating-hours')
export class OperatingHoursController {
  constructor(private readonly service: OperatingHoursService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar horários de funcionamento (público)' })
  async findAll() {
    return this.service.findAll();
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('OPERATING_HOURS_MANAGE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Salvar horários de funcionamento (admin/atendente)' })
  async upsert(@Body() dto: UpsertOperatingHoursDto) {
    return this.service.upsert(dto);
  }
}

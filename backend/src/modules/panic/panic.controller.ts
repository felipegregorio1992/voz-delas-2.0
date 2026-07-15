import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PanicService } from './panic.service';
import { AddPanicLocationDto } from './dto/add-panic-location.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Panic')
@Controller('panic')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PanicController {
  constructor(private readonly panicService: PanicService) {}

  @Get('active')
  @ApiOperation({ summary: 'Verificar se há pânico ativo para o usuário atual' })
  async getActive(@CurrentUser() user: any) {
    if (!user || !user.id) {
      throw new Error('User não encontrado no request. Verifique JwtStrategy.validate()');
    }
    
    const activePanic = await this.panicService.findActiveForUser(user.id);
    
    // Retornar null se não houver pânico ativo (não lançar erro)
    return activePanic || null;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ panic: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Acionar botão do pânico' })
  async create(@CurrentUser() user: any, @Request() request) {
    // Debug: verificar se user está presente
    if (!user || !user.id) {
      throw new Error('User não encontrado no request. Verifique JwtStrategy.validate()');
    }
    
    return this.panicService.create(user.id, request);
  }

  @Post(':id/locations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar localização ao evento de pânico' })
  async addLocation(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: AddPanicLocationDto,
  ) {
    return this.panicService.addLocation(id, user.id, dto.lat, dto.lng, dto.accuracy);
  }

  @Post(':id/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encerrar evento de pânico' })
  async end(@CurrentUser() user: any, @Param('id') id: string, @Request() request) {
    return this.panicService.end(id, user.id, request);
  }
}


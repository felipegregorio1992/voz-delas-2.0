import { Controller, Post, Body, Param, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { AddIncidentLocationDto } from './dto/add-incident-location.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Locations')
@Controller('incidents/:id/locations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar localização à denúncia' })
  async addLocation(
    @CurrentUser() user: any,
    // FIX #7: ParseUUIDPipe rejeita IDs inválidos antes de chegar ao banco,
    // evitando queries desnecessárias com strings arbitrárias
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddIncidentLocationDto,
  ) {
    return this.locationsService.addIncidentLocation(id, user.id, dto);
  }
}


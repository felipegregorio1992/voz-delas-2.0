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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TotemsService } from './totems.service';
import { CreateTotemDto } from './dto/create-totem.dto';
import { UpdateTotemDto } from './dto/update-totem.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permissions } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Totems')
@Controller('totems')
export class TotemsController {
  constructor(private readonly totemsService: TotemsService) {}

  // Endpoint público — mobile acessa sem login
  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Listar totems ativos (público)' })
  async findAllPublic() {
    return this.totemsService.findAllPublic();
  }

  // Endpoints admin
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('TOTEMS_MANAGE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todos os totems (Admin)' })
  async findAll() {
    return this.totemsService.findAll();
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('TOTEMS_MANAGE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter totem por ID (Admin)' })
  async findOne(@Param('id') id: string) {
    return this.totemsService.findOne(id);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('TOTEMS_MANAGE')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar totem (Admin)' })
  async create(@CurrentUser() user: any, @Body() dto: CreateTotemDto) {
    return this.totemsService.create(dto, user.id);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('TOTEMS_MANAGE')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar totem (Admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateTotemDto) {
    return this.totemsService.update(id, dto);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('TOTEMS_MANAGE')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir totem (Admin)' })
  async delete(@Param('id') id: string) {
    return this.totemsService.delete(id);
  }
}

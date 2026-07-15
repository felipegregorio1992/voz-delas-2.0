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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TrustedContactsService } from './trusted-contacts.service';
import { CreateTrustedContactDto } from './dto/create-trusted-contact.dto';
import { UpdateTrustedContactDto } from './dto/update-trusted-contact.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Trusted Contacts')
@Controller('me/trusted-contacts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TrustedContactsController {
  constructor(private readonly trustedContactsService: TrustedContactsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar contatos de confiança' })
  async findAll(@CurrentUser() user: any) {
    return this.trustedContactsService.findAll(user.id);
  }

  // FIX #9: Rate limit para evitar spam no limite de 3 contatos
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Criar contato de confiança (máx. 3)' })
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateTrustedContactDto,
    @Request() request,
  ) {
    return this.trustedContactsService.create(user.id, dto, request);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar contato de confiança' })
  async update(
    @CurrentUser() user: any,
    // FIX #7: UUID validation em todos os parâmetros de ID
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrustedContactDto,
    @Request() request,
  ) {
    return this.trustedContactsService.update(user.id, id, dto, request);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover contato de confiança' })
  async remove(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() request,
  ) {
    await this.trustedContactsService.remove(user.id, id, request);
  }
}


import {
  Controller,
  Get,
  Post,
  Patch,
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
import { MerchantRequestsService } from './merchant-requests.service';
import { CreateMerchantRequestDto } from './dto/create-merchant-request.dto';
import { UpdateMerchantRequestDto } from './dto/update-merchant-request.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permissions } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Merchant Requests')
@Controller('merchant-requests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MerchantRequestsController {
  constructor(private readonly merchantRequestsService: MerchantRequestsService) {}

  // FIX #9: Rate limit para evitar spam de solicitações
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Solicitar ser empreendedora' })
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateMerchantRequestDto,
    @Request() request,
  ) {
    return this.merchantRequestsService.create(user.id, dto, request);
  }

  @Get('me')
  @ApiOperation({ summary: 'Ver minha solicitação' })
  async findMyRequest(@CurrentUser() user: any) {
    return this.merchantRequestsService.findMyRequest(user.id);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar minha solicitação (se rejeitada)' })
  async updateMyRequest(
    @CurrentUser() user: any,
    @Body() dto: CreateMerchantRequestDto,
    @Request() request,
  ) {
    return this.merchantRequestsService.updateMyRequest(user.id, dto, request);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Permissions('MERCHANT_REQUESTS_MANAGE')
  @ApiOperation({ summary: 'Listar todas as solicitações (Admin)' })
  async findAll() {
    return this.merchantRequestsService.findAll();
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Permissions('MERCHANT_REQUESTS_MANAGE')
  @ApiOperation({ summary: 'Listar solicitações pendentes (Admin)' })
  async findPending() {
    return this.merchantRequestsService.findPending();
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Permissions('MERCHANT_REQUESTS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aprovar ou rejeitar solicitação (Admin)' })
  async updateStatus(
    @CurrentUser() user: any,
    // FIX #7: UUID validation
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMerchantRequestDto,
    @Request() request,
  ) {
    return this.merchantRequestsService.updateStatus(id, dto, user.id, request);
  }
}

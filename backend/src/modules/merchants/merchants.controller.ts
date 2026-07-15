import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permissions } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Merchants')
@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ver minha loja' })
  async findMyMerchant(@CurrentUser() user: any) {
    return this.merchantsService.findMyMerchant(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar minha loja' })
  async updateMyMerchant(
    @CurrentUser() user: any,
    @Body() dto: UpdateMerchantDto,
    @Request() request,
  ) {
    return this.merchantsService.updateMyMerchant(user.id, dto, request);
  }

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Listar todas as lojas (público)' })
  async findAllPublic() {
    return this.merchantsService.findAllPublic();
  }

  @Get('public/:id')
  @Public()
  @ApiOperation({ summary: 'Ver loja específica (público)' })
  async findOnePublic(@Param('id') id: string) {
    return this.merchantsService.findOnePublic(id);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('MERCHANTS_VIEW')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todas as lojas (Admin)' })
  async findAll(@CurrentUser() user: any) {
    return this.merchantsService.findAll(user.permissions);
  }

  @Patch('admin/:id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions('MERCHANTS_MANAGE')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ativar/desativar loja (Admin)' })
  async toggleMerchant(@Param('id') id: string) {
    return this.merchantsService.toggleActive(id);
  }
}

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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar produto' })
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateProductDto,
    @Request() request,
  ) {
    return this.productsService.create(user.id, dto, request);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar meus produtos' })
  async findMyProducts(@CurrentUser() user: any) {
    return this.productsService.findMyProducts(user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar produto' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Request() request,
  ) {
    return this.productsService.update(user.id, id, dto, request);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir produto' })
  async delete(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Request() request,
  ) {
    return this.productsService.delete(user.id, id, request);
  }

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Listar todos os produtos (público)' })
  async findAllPublic() {
    return this.productsService.findAllPublic();
  }

  @Get('public/merchant/:merchantId')
  @Public()
  @ApiOperation({ summary: 'Listar produtos de uma loja (público)' })
  async findByMerchantPublic(@Param('merchantId') merchantId: string) {
    return this.productsService.findByMerchantPublic(merchantId);
  }
}

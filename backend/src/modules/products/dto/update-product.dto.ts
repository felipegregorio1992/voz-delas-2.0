import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { ProductStatus } from '@prisma/client';

export class UpdateProductDto {
  @ApiProperty({ example: 'Produto Exemplo', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Descrição do produto', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 29.99, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: 'Artesanato', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ enum: ProductStatus, required: false })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;
}

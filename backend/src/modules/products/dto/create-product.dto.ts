import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsNotEmpty, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Produto Exemplo' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Descrição do produto', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 29.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: 'Artesanato', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;
}

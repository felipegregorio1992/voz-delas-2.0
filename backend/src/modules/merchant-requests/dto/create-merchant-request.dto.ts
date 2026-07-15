import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateMerchantRequestDto {
  @ApiProperty({ example: 'Loja da Maria' })
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({ example: 'Loja especializada em artesanato', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '+5521999999999', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'contato@loja.com', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ example: 'Rua Exemplo, 123', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Maricá', required: false })
  @IsOptional()
  @IsString()
  city?: string;
}

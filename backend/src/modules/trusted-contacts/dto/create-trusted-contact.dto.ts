import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, Matches } from 'class-validator';

export class CreateTrustedContactDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  name: string;

  @ApiProperty({ example: '+5511999999999' })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Telefone deve estar em formato internacional' })
  phone: string;

  @ApiProperty({ example: 'Familiar', required: false })
  @IsOptional()
  @IsString()
  relationship?: string;
}


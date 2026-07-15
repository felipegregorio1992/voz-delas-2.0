import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, Matches } from 'class-validator';

export class UpdateTrustedContactDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Telefone deve estar em formato internacional' })
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  relationship?: string;
}


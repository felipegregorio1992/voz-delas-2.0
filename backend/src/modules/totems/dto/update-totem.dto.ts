import { PartialType } from '@nestjs/swagger';
import { CreateTotemDto } from './create-totem.dto';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTotemDto extends PartialType(CreateTotemDto) {
  @ApiProperty({ description: 'Status ativo/inativo', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNotEmpty, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { SupportServiceType } from '@prisma/client';

export class CreateSupportServiceDto {
  @ApiProperty({ example: 'CEAM Maricá' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: SupportServiceType, example: SupportServiceType.CEAM })
  @IsEnum(SupportServiceType)
  type: SupportServiceType;

  @ApiProperty({ example: '+5521999999999', required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Rua Exemplo, 123', required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Segunda a Sexta, 8h às 17h', required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsString()
  hours?: string;

  @ApiProperty({ example: 'Maricá', required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsString()
  city?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (value === 'true' || value === true || value === 1 || value === '1') return true;
    if (value === 'false' || value === false || value === 0 || value === '0') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional, IsNotEmpty, IsBoolean, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Novo recurso disponível' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Agora você pode agendar atendimentos...', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ example: 'https://exemplo.com/pagina', required: false })
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiProperty({ enum: ['BANNER', 'NOTICE'], example: 'BANNER' })
  @IsIn(['BANNER', 'NOTICE'])
  type: 'BANNER' | 'NOTICE';

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

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: '2026-12-31T23:59:59.000Z', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

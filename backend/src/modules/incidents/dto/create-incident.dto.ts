import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { IncidentType } from '@prisma/client';

export class CreateIncidentDto {
  @ApiProperty({ enum: IncidentType, example: IncidentType.VIOLENCE })
  @IsEnum(IncidentType)
  type: IncidentType;

  @ApiProperty({ example: 'Descrição do incidente', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: -22.9068, required: false, description: 'Latitude da localização inicial' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiProperty({ example: -43.1729, required: false, description: 'Longitude da localização inicial' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiProperty({ example: 10.5, required: false, description: 'Precisão da localização em metros' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number;
}


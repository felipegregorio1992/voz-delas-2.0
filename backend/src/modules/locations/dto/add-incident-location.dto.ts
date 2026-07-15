import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class AddIncidentLocationDto {
  @ApiProperty({ example: -22.9068 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ example: -43.1729 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiProperty({ example: 10.5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number;
}


import { IsString, IsNotEmpty, IsNumber, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTotemDto {
  @ApiProperty({ description: 'Nome do totem' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'Descrição do totem', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'Endereço do totem' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  address: string;

  @ApiProperty({ description: 'Latitude' })
  @IsNumber()
  lat: number;

  @ApiProperty({ description: 'Longitude' })
  @IsNumber()
  lng: number;
}

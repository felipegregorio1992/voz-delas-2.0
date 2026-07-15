import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsString, Matches, Max, Min, ValidateNested } from 'class-validator';

export class OperatingHourItemDto {
  @ApiProperty({ example: 1, description: '0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ example: '08:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'openTime deve estar no formato HH:MM' })
  openTime: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'closeTime deve estar no formato HH:MM' })
  closeTime: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}

export class UpsertOperatingHoursDto {
  @ApiProperty({ type: [OperatingHourItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperatingHourItemDto)
  hours: OperatingHourItemDto[];
}

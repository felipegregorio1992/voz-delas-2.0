import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { AttendanceType } from '@prisma/client';

export class CreateAttendanceDto {
  @ApiProperty({ 
    enum: AttendanceType, 
    example: AttendanceType.ANONYMOUS,
    description: 'Tipo de atendimento: identificado, semi-identificado ou anônimo'
  })
  @IsEnum(AttendanceType)
  @IsNotEmpty()
  type: AttendanceType;
}

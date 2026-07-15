import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AttendanceStatus, RiskLevel } from '@prisma/client';

export class UpdateAttendanceDto {
  @ApiProperty({ 
    enum: AttendanceStatus, 
    example: AttendanceStatus.IN_PROGRESS,
    description: 'Status do atendimento',
    required: false
  })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiProperty({ 
    enum: RiskLevel, 
    example: RiskLevel.MEDIUM,
    description: 'Nível de risco',
    required: false
  })
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @ApiProperty({ 
    example: 'Observações do atendimento',
    description: 'Observações registradas pela atendente',
    required: false
  })
  @IsOptional()
  @IsString()
  observations?: string;
}

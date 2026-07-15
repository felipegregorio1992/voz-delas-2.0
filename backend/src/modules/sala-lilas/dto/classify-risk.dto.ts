import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RiskLevel } from '@prisma/client';

export class ClassifyRiskDto {
  @ApiProperty({ 
    enum: RiskLevel, 
    example: RiskLevel.MEDIUM,
    description: 'Nível de risco: baixo, médio ou alto'
  })
  @IsEnum(RiskLevel)
  @IsNotEmpty()
  riskLevel: RiskLevel;

  @ApiProperty({ 
    example: 'Observações sobre a classificação de risco',
    description: 'Notas adicionais sobre a classificação',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

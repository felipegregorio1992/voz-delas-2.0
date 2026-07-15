import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateReferralDto {
  @ApiProperty({ 
    example: 'uuid-do-servico',
    description: 'ID do serviço de apoio para encaminhamento'
  })
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({ 
    example: 'Observações sobre o encaminhamento',
    description: 'Notas adicionais sobre o encaminhamento',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

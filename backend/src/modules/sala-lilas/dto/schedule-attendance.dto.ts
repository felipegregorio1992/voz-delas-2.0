import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum ScheduleServiceType {
  ASSISTENCIA_SOCIAL = 'ASSISTENCIA_SOCIAL',
  ADVOCACIA = 'ADVOCACIA',
  PSICOLOGIA = 'PSICOLOGIA',
  NUTRICAO = 'NUTRICAO',
  FISIOTERAPIA = 'FISIOTERAPIA',
  AURICULOTERAPIA = 'AURICULOTERAPIA',
  TERAPIA_GRUPO = 'TERAPIA_GRUPO',
  SALAO_BELEZA = 'SALAO_BELEZA',
  ATIVIDADE_FISICA = 'ATIVIDADE_FISICA',
  ATIVIDADE_COLETIVA = 'ATIVIDADE_COLETIVA',
  DEFESA_PESSOAL = 'DEFESA_PESSOAL',
  CAIMO = 'CAIMO',
  OUTRO = 'OUTRO',
}

export const SCHEDULE_SERVICE_LABELS: Record<ScheduleServiceType, string> = {
  [ScheduleServiceType.ASSISTENCIA_SOCIAL]: 'Assistência Social',
  [ScheduleServiceType.ADVOCACIA]: 'Advocacia / Jurídico',
  [ScheduleServiceType.PSICOLOGIA]: 'Psicologia',
  [ScheduleServiceType.NUTRICAO]: 'Nutrição',
  [ScheduleServiceType.FISIOTERAPIA]: 'Fisioterapia',
  [ScheduleServiceType.AURICULOTERAPIA]: 'Auriculoterapia',
  [ScheduleServiceType.TERAPIA_GRUPO]: 'Terapia em Grupo',
  [ScheduleServiceType.SALAO_BELEZA]: 'Salão de Beleza',
  [ScheduleServiceType.ATIVIDADE_FISICA]: 'Atividade Física',
  [ScheduleServiceType.ATIVIDADE_COLETIVA]: 'Atividade Coletiva (Teatro, Canto, Arteterapia)',
  [ScheduleServiceType.DEFESA_PESSOAL]: 'Defesa Pessoal',
  [ScheduleServiceType.CAIMO]: 'C.A.I.M.O. (Atendimento Oncológico)',
  [ScheduleServiceType.OUTRO]: 'Outro',
};

export class ScheduleAttendanceDto {
  @ApiProperty({ 
    example: '2024-01-20T14:00:00Z',
    description: 'Data e hora agendada para o atendimento'
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledFor: string;

  @ApiProperty({ 
    example: 'uuid-do-atendente',
    description: 'ID do atendente (opcional)',
    required: false
  })
  @IsOptional()
  @IsString()
  attendantId?: string;

  @ApiProperty({
    example: 'PSICOLOGIA',
    description: 'Tipo de serviço desejado para o agendamento',
    enum: ScheduleServiceType,
    required: false
  })
  @IsOptional()
  @IsEnum(ScheduleServiceType)
  serviceType?: ScheduleServiceType;

  @ApiProperty({ 
    example: 'Observações sobre o agendamento',
    description: 'Notas adicionais',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

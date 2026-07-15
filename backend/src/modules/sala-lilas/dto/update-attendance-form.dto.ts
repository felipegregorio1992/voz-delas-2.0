import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateAttendanceFormDto {
  @ApiProperty({ 
    example: '{"pergunta1": "resposta1", "pergunta2": "resposta2"}',
    description: 'Dados do formulário em formato JSON',
    required: false
  })
  @IsOptional()
  @IsString()
  formData?: string;

  @ApiProperty({ 
    example: true,
    description: 'Indica se o formulário está completo',
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isComplete?: boolean;
}

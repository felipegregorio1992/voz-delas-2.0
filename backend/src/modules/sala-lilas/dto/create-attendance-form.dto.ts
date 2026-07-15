import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateAttendanceFormDto {
  @ApiProperty({ 
    example: '{"pergunta1": "resposta1", "pergunta2": "resposta2"}',
    description: 'Dados do formulário em formato JSON'
  })
  @IsString()
  @IsNotEmpty()
  formData: string;

  @ApiProperty({ 
    example: false,
    description: 'Indica se o formulário está completo',
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isComplete?: boolean;
}

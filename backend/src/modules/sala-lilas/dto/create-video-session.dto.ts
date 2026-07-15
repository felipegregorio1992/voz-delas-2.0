import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateVideoSessionDto {
  @ApiProperty({ 
    example: 'uuid-do-atendimento',
    description: 'ID do atendimento associado'
  })
  @IsString()
  @IsNotEmpty()
  attendanceId: string;
}

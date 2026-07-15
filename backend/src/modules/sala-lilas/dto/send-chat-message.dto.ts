import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class SendChatMessageDto {
  @ApiProperty({ 
    example: 'Olá, preciso de ajuda',
    description: 'Mensagem de texto a ser enviada'
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ 
    example: true,
    description: 'Indica se a mensagem está criptografada',
    required: false,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isEncrypted?: boolean;
}

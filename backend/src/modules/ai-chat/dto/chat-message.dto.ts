import { IsString, IsNotEmpty, MaxLength, IsOptional, IsArray } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  // Aceita o campo history do cliente para retrocompatibilidade, mas não é utilizado pelo service
  @IsOptional()
  @IsArray()
  history?: any[];
}

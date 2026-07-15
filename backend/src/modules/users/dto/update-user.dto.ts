import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, Matches } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Telefone deve estar em formato internacional' })
  phone?: string;
}


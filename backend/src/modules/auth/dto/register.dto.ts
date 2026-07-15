import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'maria@example.com', required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiProperty({ example: '+5511999999999', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Telefone deve estar em formato internacional' })
  phone?: string;

  // FIX #5: Senha com requisito de complexidade (8+ chars, maiúscula, minúscula, número, símbolo)
  @ApiProperty({
    example: 'Senha@123',
    minLength: 8,
    description: 'Mínimo 8 caracteres com maiúscula, minúscula, número e símbolo (@$!%*?&)',
  })
  @IsString()
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  @MaxLength(128, { message: 'Senha deve ter no máximo 128 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-_#^])[A-Za-z\d@$!%*?&\-_#^]{8,}$/,
    { message: 'Senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um símbolo (@$!%*?&-_#^)' },
  )
  password: string;
}


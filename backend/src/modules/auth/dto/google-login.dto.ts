import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({ description: 'Google ID Token obtido pelo app mobile' })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}

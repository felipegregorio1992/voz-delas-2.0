import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ConsentStatus } from '@prisma/client';

export class CreateConsentTermDto {
  @ApiProperty({ 
    enum: ConsentStatus, 
    example: ConsentStatus.ACCEPTED,
    description: 'Status do consentimento'
  })
  @IsEnum(ConsentStatus)
  @IsNotEmpty()
  status: ConsentStatus;
}

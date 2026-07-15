import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional } from 'class-validator';
import { MerchantRequestStatus } from '@prisma/client';

export class UpdateMerchantRequestDto {
  @ApiProperty({ enum: MerchantRequestStatus, example: MerchantRequestStatus.APPROVED })
  @IsEnum(MerchantRequestStatus)
  status: MerchantRequestStatus;

  @ApiProperty({ example: 'Motivo da rejeição', required: false })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

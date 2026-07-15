import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { AttachmentOwnerType } from '@prisma/client';

export class CreateUploadDto {
  @ApiProperty({ enum: AttachmentOwnerType, example: AttachmentOwnerType.INCIDENT })
  @IsEnum(AttachmentOwnerType)
  ownerType: AttachmentOwnerType;

  @ApiProperty({ example: 'uuid-do-incident-ou-panic' })
  @IsString()
  ownerId: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;
}


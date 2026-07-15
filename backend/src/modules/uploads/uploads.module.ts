import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  controllers: [UploadsController],
  providers: [UploadsService],
  imports: [AuditModule],
})
export class UploadsModule {}


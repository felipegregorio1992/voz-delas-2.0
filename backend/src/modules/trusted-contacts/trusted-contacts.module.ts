import { Module } from '@nestjs/common';
import { TrustedContactsController } from './trusted-contacts.controller';
import { TrustedContactsService } from './trusted-contacts.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  controllers: [TrustedContactsController],
  providers: [TrustedContactsService],
  exports: [TrustedContactsService],
  imports: [AuditModule],
})
export class TrustedContactsModule {}


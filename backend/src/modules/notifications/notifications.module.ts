import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  providers: [NotificationsService],
  exports: [NotificationsService],
  imports: [AuditModule],
})
export class NotificationsModule {}


import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PanicController } from './panic.controller';
import { PanicService } from './panic.service';
import { AuditModule } from '../audit/audit.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [PanicController],
  providers: [PanicService],
  exports: [PanicService],
  imports: [
    AuditModule,
    IntegrationsModule,
    NotificationsModule,
    ThrottlerModule.forRoot([
      {
        name: 'panic',
        ttl: 60000, // 1 minuto
        limit: 10, // 10 acionamentos por minuto
      },
    ]),
  ],
})
export class PanicModule {}


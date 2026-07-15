import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TrustedContactsModule } from './modules/trusted-contacts/trusted-contacts.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { PanicModule } from './modules/panic/panic.module';
import { LocationsModule } from './modules/locations/locations.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { SupportNetworkModule } from './modules/support-network/support-network.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditModule } from './modules/audit/audit.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { MerchantRequestsModule } from './modules/merchant-requests/merchant-requests.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { ProductsModule } from './modules/products/products.module';
import { SalaLilasModule } from './modules/sala-lilas/sala-lilas.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { OperatingHoursModule } from './modules/operating-hours/operating-hours.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { EventsModule } from './modules/events/events.module';
import { TotemsModule } from './modules/totems/totems.module';
import { AppController, AppHealthController } from './app.controller';

@Module({
  controllers: [AppController, AppHealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60', 10) * 1000,
        limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    TrustedContactsModule,
    IncidentsModule,
    PanicModule,
    LocationsModule,
    UploadsModule,
    SupportNetworkModule,
    NotificationsModule,
    AdminModule,
    AuditModule,
    IntegrationsModule,
    MerchantRequestsModule,
    MerchantsModule,
    ProductsModule,
    SalaLilasModule,
    AiChatModule,
    OperatingHoursModule,
    AnnouncementsModule,
    EventsModule,
    TotemsModule,
  ],
})
export class AppModule {}


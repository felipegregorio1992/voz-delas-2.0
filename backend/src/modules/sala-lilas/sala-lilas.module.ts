import { Module, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SalaLilasController } from './sala-lilas.controller';
import { SalaLilasService } from './sala-lilas.service';
import { SalaLilasGateway } from './sala-lilas.gateway';
import { SalaLilasEventsGateway } from './sala-lilas-events.gateway';
import { SalaLilasVideoGateway } from './sala-lilas-video.gateway';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AuditModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRES_IN'),
        },
      }),
    }),
  ],
  controllers: [SalaLilasController],
  providers: [SalaLilasService, SalaLilasGateway, SalaLilasEventsGateway, SalaLilasVideoGateway],
  exports: [SalaLilasService],
})
export class SalaLilasModule implements OnModuleInit {
  constructor(
    private salaLilasService: SalaLilasService,
    private eventsGateway: SalaLilasEventsGateway,
    private chatGateway: SalaLilasGateway,
    private videoGateway: SalaLilasVideoGateway,
  ) {}

  onModuleInit() {
    // Injetar gateways no serviço para evitar dependência circular
    this.salaLilasService.setEventsGateway(this.eventsGateway);
    this.salaLilasService.setChatGateway(this.chatGateway);
    this.salaLilasService.setVideoGateway(this.videoGateway);
  }
}

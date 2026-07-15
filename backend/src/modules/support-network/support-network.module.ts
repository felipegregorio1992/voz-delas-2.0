import { Module } from '@nestjs/common';
import { SupportNetworkController } from './support-network.controller';
import { SupportNetworkService } from './support-network.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [SupportNetworkController],
  providers: [SupportNetworkService],
  exports: [SupportNetworkService],
})
export class SupportNetworkModule {}


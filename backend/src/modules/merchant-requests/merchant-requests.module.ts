import { Module } from '@nestjs/common';
import { MerchantRequestsService } from './merchant-requests.service';
import { MerchantRequestsController } from './merchant-requests.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [MerchantRequestsController],
  providers: [MerchantRequestsService],
  exports: [MerchantRequestsService],
})
export class MerchantRequestsModule {}

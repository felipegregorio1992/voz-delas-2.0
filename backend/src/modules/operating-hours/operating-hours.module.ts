import { Module } from '@nestjs/common';
import { OperatingHoursController } from './operating-hours.controller';
import { OperatingHoursService } from './operating-hours.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OperatingHoursController],
  providers: [OperatingHoursService],
  exports: [OperatingHoursService],
})
export class OperatingHoursModule {}

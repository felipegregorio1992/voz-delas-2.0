import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { IncidentsModule } from '../incidents/incidents.module';
import { PanicModule } from '../panic/panic.module';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  imports: [IncidentsModule, PanicModule, PrismaModule],
})
export class AdminModule {}


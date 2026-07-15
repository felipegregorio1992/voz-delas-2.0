import { Module } from '@nestjs/common';
import { TotemsController } from './totems.controller';
import { TotemsService } from './totems.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TotemsController],
  providers: [TotemsService],
})
export class TotemsModule {}

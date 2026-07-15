import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpsertOperatingHoursDto } from './dto/upsert-operating-hours.dto';

@Injectable()
export class OperatingHoursService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.operatingHours.findMany({
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async upsert(dto: UpsertOperatingHoursDto) {
    const results = await Promise.all(
      dto.hours.map((item) =>
        this.prisma.operatingHours.upsert({
          where: { dayOfWeek: item.dayOfWeek },
          update: {
            openTime: item.openTime,
            closeTime: item.closeTime,
            isActive: item.isActive,
          },
          create: {
            dayOfWeek: item.dayOfWeek,
            openTime: item.openTime,
            closeTime: item.closeTime,
            isActive: item.isActive,
          },
        }),
      ),
    );
    return results;
  }
}

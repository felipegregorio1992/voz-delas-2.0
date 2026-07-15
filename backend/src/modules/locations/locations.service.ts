import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AddIncidentLocationDto } from './dto/add-incident-location.dto';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async addIncidentLocation(incidentId: string, userId: string, dto: AddIncidentLocationDto) {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) {
      throw new NotFoundException('Denúncia não encontrada');
    }

    if (incident.userId !== userId) {
      throw new ForbiddenException('Você não tem permissão para adicionar localização a esta denúncia');
    }

    return this.prisma.incidentLocation.create({
      data: {
        incidentId,
        lat: dto.lat,
        lng: dto.lng,
        accuracy: dto.accuracy,
      },
    });
  }
}


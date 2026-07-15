import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTotemDto } from './dto/create-totem.dto';
import { UpdateTotemDto } from './dto/update-totem.dto';

@Injectable()
export class TotemsService {
  constructor(private prisma: PrismaService) {}

  async findAllPublic() {
    const totems = await (this.prisma as any).supportTotem.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return { data: totems };
  }

  async findAll() {
    const totems = await (this.prisma as any).supportTotem.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { data: totems };
  }

  async findOne(id: string) {
    const totem = await (this.prisma as any).supportTotem.findUnique({
      where: { id },
    });
    if (!totem) throw new NotFoundException('Totem não encontrado');
    return { data: totem };
  }

  async create(dto: CreateTotemDto, userId: string) {
    const totem = await (this.prisma as any).supportTotem.create({
      data: {
        name: dto.name,
        description: dto.description,
        address: dto.address,
        lat: dto.lat,
        lng: dto.lng,
        createdBy: userId,
      },
    });
    return { data: totem };
  }

  async update(id: string, dto: UpdateTotemDto) {
    const existing = await (this.prisma as any).supportTotem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Totem não encontrado');

    const totem = await (this.prisma as any).supportTotem.update({
      where: { id },
      data: dto,
    });
    return { data: totem };
  }

  async delete(id: string) {
    const existing = await (this.prisma as any).supportTotem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Totem não encontrado');

    await (this.prisma as any).supportTotem.delete({ where: { id } });
    return { message: 'Totem excluído com sucesso' };
  }
}

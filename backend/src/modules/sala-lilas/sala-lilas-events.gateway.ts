import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

const isProduction = process.env.NODE_ENV === 'production';
const corsOrigins =
  process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) || [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
  ];

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      if (!origin || origin === 'null') return callback(null, true);
      if (!isProduction) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  },
  namespace: '/sala-lilas-events',
})
export class SalaLilasEventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SalaLilasEventsGateway.name);
  private readonly activeConnections = new Map<string, { userId: string; permissions: string[] }>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        this.logger.warn(`[WS Events] Conexão rejeitada: token não fornecido - ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!user || !user.isActive) {
        this.logger.warn(`[WS Events] Conexão rejeitada: usuário inválido ou inativo - ${client.id}`);
        client.disconnect();
        return;
      }

      const userPermissions = Array.from(
        new Set<string>(
          user.userRoles
            .flatMap((ur) => ur.role.rolePermissions)
            .map((rp) => rp.permission.code),
        ),
      );
      const isAttendant = userPermissions.includes('SALA_LILAS_ACCESS');

      // Armazenar conexão
      this.activeConnections.set(client.id, {
        userId: user.id,
        permissions: userPermissions,
      });

      client.join(`user:${user.id}`);
      if (isAttendant) {
        client.join('attendants');
      }

      this.logger.log(
        `[WS Events] Cliente conectado: ${client.id} - User: ${user.id} - Permissions: ${userPermissions.join(',') || 'none'}`,
      );
    } catch (error) {
      this.logger.error(`[WS Events] Erro ao conectar: ${error.message} - ${client.id}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const connection = this.activeConnections.get(client.id);
    if (connection) {
      this.logger.log(`[WS Events] Cliente desconectado: ${client.id} - User: ${connection.userId}`);
      this.activeConnections.delete(client.id);
    }
  }

  // Método para emitir evento de novo atendimento
  emitNewAttendance(attendance: any) {
    this.server.to('attendants').emit('new-attendance', attendance);
    this.logger.log(`[WS Events] Novo atendimento emitido: ${attendance.id}`);
  }

  // Método para emitir evento de atualização de atendimento
  emitAttendanceUpdate(attendance: any) {
    this.server.to('attendants').emit('attendance-updated', attendance);
    this.logger.log(`[WS Events] Atendimento atualizado emitido: ${attendance.id}`);
  }

  // Método para emitir evento de atendimento removido (concluído/cancelado)
  emitAttendanceRemoved(attendanceId: string) {
    this.server.to('attendants').emit('attendance-removed', { attendanceId });
    this.logger.log(`[WS Events] Atendimento removido emitido: ${attendanceId}`);
  }

  emitScheduleCreated(scheduledAttendance: any) {
    this.server.to('attendants').emit('schedule-created', scheduledAttendance);
    if (scheduledAttendance?.clientId) {
      this.server.to(`user:${scheduledAttendance.clientId}`).emit('schedule-created', scheduledAttendance);
    }
    this.logger.log(`[WS Events] Agendamento criado emitido: ${scheduledAttendance?.id ?? 'unknown'}`);
  }

  emitScheduleUpdated(scheduledAttendance: any) {
    this.server.to('attendants').emit('schedule-updated', scheduledAttendance);
    if (scheduledAttendance?.clientId) {
      this.server.to(`user:${scheduledAttendance.clientId}`).emit('schedule-updated', scheduledAttendance);
    }
    this.logger.log(`[WS Events] Agendamento atualizado emitido: ${scheduledAttendance?.id ?? 'unknown'}`);
  }

  // FIX #21: Aceitar token apenas via handshake.auth — nunca via query string.
  private extractTokenFromSocket(client: Socket): string | null {
    const token = client.handshake.auth?.token;
    if (token && typeof token === 'string') return token;

    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}

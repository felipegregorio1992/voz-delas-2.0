import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { VideoSessionStatus } from '@prisma/client';

const isProduction = process.env.NODE_ENV === 'production';
const corsOrigins =
  process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) || [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
  ];

interface Participant {
  socketId: string;
  userId: string;
  role: 'client' | 'attendant';
  name: string;
}

interface Room {
  attendanceId: string;
  // Chave é o userId para garantir unicidade por usuário
  participants: Map<string, Participant>; 
  createdAt: Date;
  expiresAt: Date;
  timer?: NodeJS.Timeout;
}

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
  namespace: '/sala-lilas-video',
})
export class SalaLilasVideoGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SalaLilasVideoGateway.name);
  
  // Map<attendanceId, Room>
  private readonly rooms = new Map<string, Room>();
  
  // Map<socketId, { attendanceId: string; userId: string }> para busca rápida no disconnect
  private readonly socketToRoom = new Map<string, { attendanceId: string; userId: string }>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.disconnect(client, 'Token não fornecido');
        return;
      }

      const payload = await this.verifyToken(token);
      if (!payload) {
        this.disconnect(client, 'Token inválido');
        return;
      }

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
        this.disconnect(client, 'Usuário inválido');
        return;
      }

      const attendanceId = client.handshake.query.attendanceId as string;
      if (!attendanceId) {
        this.disconnect(client, 'AttendanceId obrigatório');
        return;
      }

      const attendance = await this.prisma.attendance.findUnique({
        where: { id: attendanceId },
      });

      if (!attendance) {
        this.disconnect(client, 'Atendimento não encontrado');
        return;
      }

      // Determinar papel
      const isClient = attendance.clientId === user.id;
      const userPermissions = Array.from(
        new Set(
          user.userRoles
            .flatMap((ur) => ur.role.rolePermissions)
            .map((rp) => rp.permission.code),
        ),
      );
      const isAttendant = userPermissions.includes('SALA_LILAS_ACCESS');

      if (!isClient && !isAttendant) {
        this.disconnect(client, 'Sem permissão para este atendimento');
        return;
      }

      const role: 'client' | 'attendant' = isClient ? 'client' : 'attendant';

      // Gerenciar Sala
      let room = this.rooms.get(attendanceId);
      if (!room) {
        room = {
          attendanceId,
          participants: new Map(),
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
        };
        this.rooms.set(attendanceId, room);
        this.logger.log(`[WS Video] Sala criada: ${attendanceId}`);
      }

      // LÓGICA DE AUTO-CURA (SELF-HEALING)
      // 1. Verificar se o usuário já está na sala (mesmo ID)
      const existingParticipant = room.participants.get(user.id);
      if (existingParticipant) {
        this.logger.warn(`[WS Video] Usuário ${user.id} reconectando. Derrubando conexão antiga: ${existingParticipant.socketId}`);
        
        // Desconectar socket antigo
        const oldSocket = this.server.sockets.sockets.get(existingParticipant.socketId);
        if (oldSocket) {
          oldSocket.emit('error', { message: 'Você conectou em outro dispositivo.' });
          oldSocket.disconnect(true);
        }
        
        // Remover referências antigas
        this.socketToRoom.delete(existingParticipant.socketId);
        room.participants.delete(user.id);
      }

      // 2. Verificar conflito de papel (ex: já tem um atendente diferente)
      // Se eu sou atendente, verificar se já tem OUTRO atendente na sala
      const existingRoleUser = Array.from(room.participants.values()).find(p => p.role === role);
      if (existingRoleUser && existingRoleUser.userId !== user.id) {
        this.logger.warn(`[WS Video] Papel ${role} já ocupado por ${existingRoleUser.userId}`);
        this.disconnect(client, `O papel de ${role} já está ocupado nesta sala.`);
        return;
      }

      // 3. Adicionar novo participante
      const participant: Participant = {
        socketId: client.id,
        userId: user.id,
        role,
        name: user.name,
      };

      room.participants.set(user.id, participant);
      this.socketToRoom.set(client.id, { attendanceId, userId: user.id });

      client.join(`room:${attendanceId}`);

      // Notificar sucesso e estado atual
      this.logger.log(`[WS Video] Conectado: ${user.name} (${role}) na sala ${attendanceId}`);
      
      // Enviar lista de quem já está lá, incluindo expiresAt para o timer do cliente
      const others = Array.from(room.participants.values())
        .filter(p => p.userId !== user.id)
        .map(p => ({ userId: p.userId, role: p.role, name: p.name }));

      client.emit('room-info', {
        attendanceId,
        participants: others,
        expiresAt: room.expiresAt.toISOString(), // FIX: incluir expiresAt para o timer no frontend
      });

      // Avisar os outros que entrei
      client.to(`room:${attendanceId}`).emit('user-joined', {
        userId: user.id,
        role,
        name: user.name,
      });

    } catch (error) {
      this.logger.error(`[WS Video] Erro fatal na conexão: ${error.message}`);
      this.disconnect(client, 'Erro interno do servidor');
    }
  }

  async handleDisconnect(client: Socket) {
    const info = this.socketToRoom.get(client.id);
    if (info) {
      const { attendanceId, userId } = info;
      const room = this.rooms.get(attendanceId);
      
      if (room) {
        const participant = room.participants.get(userId);
        // Só remover se for O MESMO socket. 
        // Se o usuário reconectou rápido, o socketId no room já será o novo, e não queremos remover o novo.
        if (participant && participant.socketId === client.id) {
          room.participants.delete(userId);
          this.logger.log(`[WS Video] Removido: ${userId} da sala ${attendanceId}`);
          
          this.server.to(`room:${attendanceId}`).emit('user-left', {
            userId,
            timestamp: new Date(),
          });

          // Se sala vazia, agendar destruição
          if (room.participants.size === 0) {
            this.scheduleRoomDestruction(attendanceId);
          }
        }
      }
      this.socketToRoom.delete(client.id);
    }
  }

  // --- WebRTC Signaling (Simples e Direto) ---

  @SubscribeMessage('offer')
  handleOffer(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.forwardSignal(client, 'offer', data);
  }

  @SubscribeMessage('answer')
  handleAnswer(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.forwardSignal(client, 'answer', data);
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.forwardSignal(client, 'ice-candidate', data);
  }

  // FIX: Handler para toggle de mídia (vídeo/áudio) — sem isso o outro participante
  // nunca sabe que a câmera/microfone foi desligado
  @SubscribeMessage('toggle-media')
  handleToggleMedia(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const info = this.socketToRoom.get(client.id);
    if (!info) return;
    // Repassar para todos na sala exceto o remetente
    client.to(`room:${info.attendanceId}`).emit('media-toggled', {
      from: info.userId,
      type: data.type,   // 'video' | 'audio'
      enabled: data.enabled,
    });
  }

  // FIX: Handler para encerramento de chamada — sem isso o outro participante
  // não sabe que a chamada foi encerrada pelo peer
  @SubscribeMessage('end-call')
  handleEndCall(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const info = this.socketToRoom.get(client.id);
    if (!info) return;
    // Notificar todos na sala que a chamada foi encerrada
    this.server.to(`room:${info.attendanceId}`).emit('call-ended', {
      endedBy: info.userId,
      timestamp: new Date(),
    });
    this.logger.log(`[WS Video] Chamada encerrada por ${info.userId} na sala ${info.attendanceId}`);
  }

  private forwardSignal(client: Socket, event: string, data: any) {
    const info = this.socketToRoom.get(client.id);
    if (!info) return;

    // Repassar para todos na sala EXCETO o remetente
    client.to(`room:${info.attendanceId}`).emit(event, {
      from: info.userId,
      ...data, // data geralmente contém { sdp, type, candidate, etc }
    });
  }

  // --- Utilitários ---

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth?.token || client.handshake.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) return auth.substring(7);
    return auth || null;
  }

  private async verifyToken(token: string) {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });
    } catch {
      return null;
    }
  }

  private disconnect(client: Socket, message: string) {
    client.emit('error', { message });
    client.disconnect(true);
  }

  private scheduleRoomDestruction(attendanceId: string) {
    setTimeout(() => {
      const room = this.rooms.get(attendanceId);
      if (room && room.participants.size === 0) {
        this.rooms.delete(attendanceId);
        this.logger.log(`[WS Video] Sala destruída por inatividade: ${attendanceId}`);
      }
    }, 5000); // 5 segundos de tolerância
  }

  // Método administrativo para limpar sala (se necessário)
  forceClearRoom(attendanceId: string) {
    const room = this.rooms.get(attendanceId);
    if (room) {
      for (const p of room.participants.values()) {
        const socket = this.server.sockets.sockets.get(p.socketId);
        socket?.disconnect(true);
      }
      this.rooms.delete(attendanceId);
      this.logger.log(`[WS Video] Sala limpa forçadamente: ${attendanceId}`);
    }
  }
}

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
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SalaLilasService } from './sala-lilas.service';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import * as crypto from 'crypto';

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
  namespace: '/sala-lilas-chat',
})
export class SalaLilasGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SalaLilasGateway.name);
  private readonly encryptionKey: string;
  private readonly activeConnections = new Map<string, { userId: string; attendanceId: string; permissions: string[] }>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private salaLilasService: SalaLilasService,
  ) {
    const provided = this.configService.get<string>('CHAT_ENCRYPTION_KEY');
    const jwtSecret = this.configService.get<string>('JWT_ACCESS_SECRET');

    const derivedFromJwt = () => {
      if (!jwtSecret) {
        throw new Error('JWT_ACCESS_SECRET não configurada');
      }
      return crypto.createHash('sha256').update(jwtSecret).digest('hex');
    };

    const normalizeToHex32 = (value: string) => {
      const hex = value.trim();
      const buf = Buffer.from(hex, 'hex');
      if (buf.length === 32) return hex;
      return crypto.createHash('sha256').update(value).digest('hex');
    };

    const rawKey = provided ? normalizeToHex32(provided) : derivedFromJwt();
    const keyBuffer = Buffer.from(rawKey, 'hex');
    if (keyBuffer.length !== 32) {
      throw new Error('Falha ao inicializar CHAT_ENCRYPTION_KEY');
    }
    this.encryptionKey = rawKey;
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        this.logger.warn(`[WS] Conexão rejeitada: token não fornecido - ${client.id}`);
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
        this.logger.warn(`[WS] Conexão rejeitada: usuário inválido ou inativo - ${client.id}`);
        client.disconnect();
        return;
      }

      const attendanceId = client.handshake.query.attendanceId as string;
      if (!attendanceId) {
        this.logger.warn(`[WS] Conexão rejeitada: attendanceId não fornecido - ${client.id}`);
        client.disconnect();
        return;
      }

      // Verificar se o usuário tem acesso ao atendimento
      const attendance = await this.prisma.attendance.findUnique({
        where: { id: attendanceId },
      });

      if (!attendance) {
        this.logger.warn(`[WS] Conexão rejeitada: atendimento não encontrado - ${client.id}`);
        client.disconnect();
        return;
      }

      const isClient = attendance.clientId === user.id;
      const userPermissions = Array.from(
        new Set<string>(
          user.userRoles
            .flatMap((ur) => ur.role.rolePermissions)
            .map((rp) => rp.permission.code),
        ),
      );
      const isStaff = userPermissions.includes('SALA_LILAS_ACCESS');

      if (!isClient && !isStaff) {
        this.logger.warn(`[WS] Conexão rejeitada: sem permissão - ${client.id}`);
        client.disconnect();
        return;
      }

      // Verificar consentimento para registro de mensagens
      const consentTerm = await this.prisma.consentTerm.findUnique({
        where: { attendanceId },
      });

      const canRecordMessages = consentTerm?.status === 'ACCEPTED';

      // Armazenar conexão
      this.activeConnections.set(client.id, {
        userId: user.id,
        attendanceId,
        permissions: userPermissions,
      });

      // Entrar na sala do atendimento
      client.join(`attendance:${attendanceId}`);

      this.logger.log(`[WS] Cliente conectado: ${client.id} - User: ${user.id} - Attendance: ${attendanceId}`);

      // Notificar outros participantes
      this.server.to(`attendance:${attendanceId}`).emit('user-connected', {
        userId: user.id,
        userName: user.name,
        timestamp: new Date(),
      });

      // Sinalizar ao cliente que está pronto para receber comandos
      // Inclui o estado atual de visibilidade do chat para restaurar após reconexão
      const attendanceState = await this.prisma.attendance.findUnique({
        where: { id: attendanceId },
        select: { chatHidden: true },
      });

      client.emit('chat-ready', {
        attendanceId,
        chatHidden: attendanceState?.chatHidden ?? false,
      });
    } catch (error) {
      this.logger.error(`[WS] Erro ao conectar: ${error.message} - ${client.id}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const connection = this.activeConnections.get(client.id);
    if (connection) {
      this.logger.log(`[WS] Cliente desconectado: ${client.id} - User: ${connection.userId}`);
      
      // Notificar outros participantes
      this.server.to(`attendance:${connection.attendanceId}`).emit('user-disconnected', {
        userId: connection.userId,
        timestamp: new Date(),
      });

      this.activeConnections.delete(client.id);
    }
  }

  @SubscribeMessage('send-message')
  async handleMessage(
    @MessageBody() dto: SendChatMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const connection = this.activeConnections.get(client.id);
      if (!connection) {
        return { error: 'Conexão não encontrada' };
      }

      const { userId, attendanceId } = connection;

      // Verificar se o atendimento ainda está ativo
      const attendance = await this.prisma.attendance.findUnique({
        where: { id: attendanceId },
      });

      if (!attendance || attendance.status === 'COMPLETED' || attendance.status === 'CANCELLED') {
        return { error: 'Atendimento não está mais ativo' };
      }

      // Verificar consentimento para registro
      const consentTerm = await this.prisma.consentTerm.findUnique({
        where: { attendanceId },
      });

      const canRecordMessages = consentTerm?.status === 'ACCEPTED';

      // Criptografar mensagem
      const encryptedMessage = this.encryptMessage(dto.message);

      // Sempre salvar a mensagem no banco para manter histórico
      const savedMessage = await this.prisma.chatMessage.create({
        data: {
          attendanceId,
          senderId: userId,
          message: encryptedMessage,
          isEncrypted: true,
        },
      });

      // Obter informações do remetente
      const sender = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
        },
      });

      // Enviar mensagem para todos na sala (mensagem descriptografada para exibição)
      const messageData = {
        id: savedMessage.id,
        attendanceId,
        senderId: userId,
        senderName: sender?.name || 'Usuário',
        message: dto.message, // Mensagem descriptografada para exibição
        isEncrypted: dto.isEncrypted !== false,
        createdAt: savedMessage.createdAt,
        recorded: canRecordMessages,
      };

      this.server.to(`attendance:${attendanceId}`).emit('new-message', messageData);

      return { success: true, message: messageData };
    } catch (error) {
      this.logger.error(`[WS] Erro ao enviar mensagem: ${error.message}`);
      return { error: 'Erro ao enviar mensagem' };
    }
  }

  @SubscribeMessage('end-attendance')
  async handleEndAttendance(
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const connection = this.activeConnections.get(client.id);
      if (!connection) {
        return { error: 'Conexão não encontrada' };
      }

      const { userId, attendanceId } = connection;

      // Apenas o cliente pode encerrar o atendimento rapidamente
      const attendance = await this.prisma.attendance.findUnique({
        where: { id: attendanceId },
      });

      if (!attendance) {
        return { error: 'Atendimento não encontrado' };
      }

      if (attendance.clientId !== userId) {
        return { error: 'Apenas o cliente pode encerrar o atendimento desta forma' };
      }

      // Atualizar status do atendimento
      await this.prisma.attendance.update({
        where: { id: attendanceId },
        data: {
          status: 'COMPLETED',
          endedAt: new Date(),
        },
      });

      // Notificar todos na sala
      this.server.to(`attendance:${attendanceId}`).emit('attendance-ended', {
        attendanceId,
        endedBy: userId,
        timestamp: new Date(),
      });

      // Desconectar todos da sala
      const sockets = await this.server.in(`attendance:${attendanceId}`).fetchSockets();
      sockets.forEach(socket => {
        socket.leave(`attendance:${attendanceId}`);
        socket.disconnect();
      });

      return { success: true, message: 'Atendimento encerrado' };
    } catch (error) {
      this.logger.error(`[WS] Erro ao encerrar atendimento: ${error.message}`);
      return { error: 'Erro ao encerrar atendimento' };
    }
  }

  @SubscribeMessage('toggle-chat-visibility')
  async handleToggleChatVisibility(
    @MessageBody() data: { hidden: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const connection = this.activeConnections.get(client.id);
      if (!connection) {
        return { error: 'Conexão não encontrada' };
      }

      const { userId, attendanceId } = connection;

      // Mobile só pode ocultar (hidden: true), não pode reexibir
      // Reexibir (hidden: false) é exclusivo do web/atendente
      const attendance = await this.prisma.attendance.findUnique({
        where: { id: attendanceId },
        select: { chatHidden: true },
      });

      if (data.hidden === false && attendance?.chatHidden === true) {
        // Verificar se é atendente/admin — só eles podem reexibir
        if (!connection.permissions.includes('SALA_LILAS_ACCESS')) {
          return { error: 'Apenas o atendente pode reexibir o chat' };
        }
      }

      // Persistir estado no banco
      await this.prisma.attendance.update({
        where: { id: attendanceId },
        data: { chatHidden: data.hidden },
      });

      // Emitir para todos na sala (inclusive o mobile do cliente)
      this.server.to(`attendance:${attendanceId}`).emit('chat-visibility-changed', {
        hidden: data.hidden,
        changedBy: userId,
        timestamp: new Date(),
      });

      this.logger.log(`[WS] Chat ${data.hidden ? 'ocultado' : 'exibido'} - Attendance: ${attendanceId} - User: ${userId}`);

      return { success: true };
    } catch (error) {
      this.logger.error(`[WS] Erro ao alternar visibilidade do chat: ${error.message}`);
      return { error: 'Erro ao alternar visibilidade do chat' };
    }
  }

  @SubscribeMessage('get-messages')
  async handleGetMessages(
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const connection = this.activeConnections.get(client.id);
      if (!connection) {
        return { error: 'Conexão não encontrada' };
      }

      const { attendanceId } = connection;

      // Verificar consentimento (para marcar as mensagens como recorded ou não)
      const consentTerm = await this.prisma.consentTerm.findUnique({
        where: { attendanceId },
      });

      const canRecordMessages = consentTerm?.status === 'ACCEPTED';

      // Buscar todas as mensagens do banco
      const messages = await this.prisma.chatMessage.findMany({
        where: { attendanceId },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Descriptografar mensagens e normalizar formato
      const decryptedMessages = messages.map(msg => ({
        id: msg.id,
        attendanceId: msg.attendanceId,
        senderId: msg.senderId,
        senderName: msg.sender?.name || 'Usuário',
        message: this.decryptMessage(msg.message),
        isEncrypted: msg.isEncrypted,
        createdAt: msg.createdAt,
        recorded: canRecordMessages,
      }));

      return { messages: decryptedMessages };
    } catch (error) {
      this.logger.error(`[WS] Erro ao buscar mensagens: ${error.message}`);
      return { error: 'Erro ao buscar mensagens' };
    }
  }

  // FIX #21: Aceitar token apenas via handshake.auth — nunca via query string.
  // Query string aparece em logs de servidor, proxies e histórico do browser.
  private extractTokenFromSocket(client: Socket): string | null {
    const token = client.handshake.auth?.token;
    if (token && typeof token === 'string') return token;

    // Fallback para header Authorization (mobile nativo)
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // NÃO aceitar via query string — removido intencionalmente
    return null;
  }

  private encryptMessage(message: string): string {
    // FIX #3: Usar buffer de 32 bytes derivado do hex — sem truncamento nem padding
    const keyBuffer = Buffer.from(this.encryptionKey, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
    // FIX #4: Sem try/catch — se a criptografia falhar, o erro propaga.
    // Nunca armazenar mensagem em plaintext silenciosamente.
  }

  private decryptMessage(encryptedMessage: string): string {
    // FIX #3: Usar buffer de 32 bytes derivado do hex
    const keyBuffer = Buffer.from(this.encryptionKey, 'hex');
    try {
      const parts = encryptedMessage.split(':');
      if (parts.length !== 2) {
        return encryptedMessage; // Mensagem legada não criptografada
      }
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.error(`[WS] Erro ao descriptografar mensagem: ${error.message}`);
      return '[mensagem não pôde ser descriptografada]';
    }
  }

  // Método para emitir evento de videochamada iniciada
  emitVideoCallStarted(attendanceId: string, session: any) {
    try {
      if (!this.server) {
        this.logger.warn(`[WS] Server não está disponível para emitir evento de videochamada`);
        return;
      }

      const eventData = {
        sessionId: session.id,
        attendanceId: session.attendanceId,
        clientId: session.clientId,
        attendantId: session.attendantId,
        status: session.status,
        token: session.token || null,
      };

      this.server.to(`attendance:${attendanceId}`).emit('video-call-started', eventData);
      this.logger.log(`[WS] Videochamada iniciada emitida: ${session.id} - Attendance: ${attendanceId}`);
    } catch (error) {
      this.logger.error(`[WS] Erro ao emitir evento de videochamada: ${error.message}`);
    }
  }
}

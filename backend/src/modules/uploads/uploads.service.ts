import { Injectable, BadRequestException } from '@nestjs/common';
import * as path from 'path';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AttachmentOwnerType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { getIpFromRequest, getUserAgentFromRequest } from '../../common/utils/request-context.util';

// FIX #7: Extensões permitidas explicitamente (defesa em profundidade além do MIME)
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

// FIX #7: Magic bytes para validação real do conteúdo do arquivo (não apenas o header MIME)
const MAGIC_BYTES: Record<string, Buffer[]> = {
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/png':  [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  'image/webp': [Buffer.from('RIFF'), Buffer.from('WEBP')],
  'application/pdf': [Buffer.from('%PDF')],
};

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) return false;

  if (mimeType === 'image/webp') {
    // WEBP: bytes 0-3 = "RIFF", bytes 8-11 = "WEBP"
    return (
      buffer.slice(0, 4).equals(signatures[0]) &&
      buffer.length >= 12 &&
      buffer.slice(8, 12).equals(signatures[1])
    );
  }

  return signatures.some((sig) => buffer.slice(0, sig.length).equals(sig));
}

@Injectable()
export class UploadsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async createAttachment(
    userId: string,
    ownerType: AttachmentOwnerType,
    ownerId: string,
    file: Express.Multer.File,
    request: any,
  ) {
    // Validar tipo MIME contra lista permitida
    const allowedTypes = process.env.ALLOWED_MIME_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Tipo de arquivo não permitido: ${file.mimetype}`);
    }

    // FIX #7: Validar extensão do arquivo (defesa em profundidade)
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(`Extensão não permitida: ${ext}`);
    }

    // FIX #7: Validar magic bytes — impede que um arquivo malicioso seja renomeado
    // para .jpg e enviado com mimetype falsificado no header
    if (file.buffer && file.buffer.length >= 4) {
      if (!validateMagicBytes(file.buffer, file.mimetype)) {
        throw new BadRequestException('Conteúdo do arquivo não corresponde ao tipo declarado');
      }
    }

    // Validar tamanho
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10); // 5MB default
    if (file.size > maxSize) {
      throw new BadRequestException(`Arquivo excede o tamanho máximo de ${maxSize} bytes`);
    }

    // FIX #7: Nome seguro com UUID — evita path traversal e injeção via originalname
    // Ex: "../../etc/passwd" ou "script.php.jpg" não chegam ao sistema de arquivos
    const safeFilename = `${crypto.randomUUID()}${ext}`;

    // Em produção, fazer upload para S3/Cloud Storage usando safeFilename
    const url = `/uploads/${safeFilename}`;

    const attachment = await this.prisma.attachment.create({
      data: {
        ownerType,
        ownerId,
        mimeType: file.mimetype,
        size: file.size,
        url,
      },
    });

    await this.auditService.log({
      userId,
      action: 'ATTACHMENT_UPLOADED',
      entity: 'Attachment',
      entityId: attachment.id,
      ip: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      detailsJson: JSON.stringify({ ownerType, ownerId, mimeType: file.mimetype, size: file.size }),
    });

    return attachment;
  }
}


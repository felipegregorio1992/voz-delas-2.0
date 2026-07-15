import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AiChatService } from './ai-chat.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('AI Chat')
@Controller('ai-chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  // FIX #5: Rate limit dedicado para o endpoint de IA.
  // Sem isso, um usuário pode esgotar a cota/orçamento da OpenAI (DoS financeiro).
  // 20 mensagens por minuto é generoso para uso legítimo mas bloqueia abuso.
  @Post('message')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Enviar mensagem para a IA assistente' })
  async sendMessage(@Body() dto: ChatMessageDto, @CurrentUser() user: any) {
    return this.aiChatService.sendMessage(dto, user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Buscar histórico de mensagens com a IA' })
  async getHistory(@CurrentUser() user: any) {
    return this.aiChatService.getHistory(user.id);
  }
}

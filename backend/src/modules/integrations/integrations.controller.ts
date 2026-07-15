import { Controller, Post, Param, UseGuards, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { IntegrationProvider } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permissions } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Integrations')
@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Permissions('ADMIN_PANEL')
@ApiBearerAuth()
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post(':provider/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Testar integração com provedor (stub)' })
  async testIntegration(
    @CurrentUser() user: any,
    @Param('provider') provider: string,
  ) {
    const providerEnum = provider.toUpperCase() as IntegrationProvider;
    if (!Object.values(IntegrationProvider).includes(providerEnum)) {
      // FIX #16: BadRequestException em vez de Error genérico (que retornaria 500)
      // e não refletir o valor do usuário na mensagem de erro
      throw new BadRequestException('Provedor de integração inválido');
    }

    return this.integrationsService.testIntegration(providerEnum, user.id);
  }
}


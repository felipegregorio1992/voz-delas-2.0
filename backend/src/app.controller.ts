import { Controller, Get, Redirect, All } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller()
export class AppController {
  @Get()
  @Redirect('/docs', 302)
  redirectToDocs() {
    return { url: '/docs' };
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      message: 'Voz Delas API is running',
      timestamp: new Date().toISOString(),
    };
  }
}

// Controller adicional para health com prefixo global
@ApiExcludeController()
@Controller('api/v1')
export class AppHealthController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      message: 'Voz Delas API is running',
      timestamp: new Date().toISOString(),
    };
  }
}

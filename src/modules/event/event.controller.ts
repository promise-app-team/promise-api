import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller('event')
@ApiExcludeController()
export class EventController {
  constructor() {}

  @Get('connect')
  connect(...args: any[]) {
    console.log('connect', args);
    return { message: 'Connected' };
  }

  @Get('disconnect')
  disconnect(...args: any[]) {
    console.log('disconnect', args);
    return { message: 'Disconnected' };
  }

  @Get('message')
  default(...args: any[]) {
    console.log('message', args);
    return { message: 'Default' };
  }
}

import { Body, Controller, Render } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { DevPointDTO, InputMidpointDTO } from './dev.dto';

import { Get, Post } from '@/customs/nest';
import { findGeometricMidpoint } from '@/utils/geometric';

@ApiTags('Development')
@Controller('dev')
export class DevController {
  @Get()
  @Render('dev')
  renderRoot() {}

  @Get('midpoint')
  @Render('dev/midpoint')
  renderMidpoint() {}

  @Post('midpoint', {
    description: 'Find the midpoint between two or more points',
    exceptions: ['BAD_REQUEST'],
  })
  midpoint(@Body() input: InputMidpointDTO): DevPointDTO {
    return findGeometricMidpoint(input.points);
  }
}

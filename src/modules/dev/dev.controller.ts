import { Body, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { DevPointDTO, InputMidpointDTO } from './dev.dto';

import { Post } from '@/customs/nest';
import { findGeometricMidpoint } from '@/utils/geometric';

@ApiTags('Development')
@Controller('dev')
export class DevController {
  @Post('midpoint', {
    description: 'Find the midpoint between two or more points',
    exceptions: ['BAD_REQUEST'],
  })
  midpoint(@Body() input: InputMidpointDTO): DevPointDTO {
    return findGeometricMidpoint(input.points);
  }
}

import { Body, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { DevPointDTO, InputMidpointDTO } from './dev.dto';

import { Get, Post } from '@/customs/nest';
import { findGeometricMidpoint } from '@/utils/geometric';

@ApiTags('For Developers')
@Controller('dev')
export class DevController {
  @Get('', { hidden: true, render: 'dev' })
  renderRoot() {}

  @Get('midpoint', { hidden: true, render: 'dev/midpoint' })
  renderMidpoint() {}

  @Post('midpoint', {
    description: '여러 지점의 위도/경도 정보를 받아 중간 위치를 계산합니다. <a href="/dev/midpoint"><b>테스트</b></a>',
    exceptions: ['BAD_REQUEST'],
  })
  devMidpoint(@Body() input: InputMidpointDTO): DevPointDTO {
    return findGeometricMidpoint(input.points);
  }
}

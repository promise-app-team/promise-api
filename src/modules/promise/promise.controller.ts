import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { AuthUser } from '../auth/auth.decorator';
import { DestinationType } from './promise.entity';
import { UserEntity } from '../user/user.entity';
import { PromiseService } from './promise.service';
import { InputCreatePromise, OutputCreatePromise } from './promise.dto';
import { ThemeEntity } from './theme.entity';

@ApiTags('Promise')
@ApiBearerAuth()
@Controller('promise')
export class PromiseController {
  constructor(private readonly promiseService: PromiseService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'promise', summary: '새로운 약속 추가' })
  @ApiOkResponse({ type: OutputCreatePromise, description: '약속 추가 성공' })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  @ApiBadRequestResponse({ description: '약속 추가 실패' })
  async promise(
    @AuthUser() user: UserEntity,
    @Body() input: InputCreatePromise,
  ): Promise<OutputCreatePromise> {
    if (
      input.destinationType === DestinationType.Static &&
      !input.destination
    ) {
      throw new BadRequestException(
        '"장소 지정" 선택 시 장소를 선택해야 합니다.',
      );
    }
    return this.promiseService.create(user.id, input);
  }

  @Get('themes')
  @ApiOperation({ operationId: 'themes', summary: '약속 테마 목록' })
  @ApiOkResponse({ type: [ThemeEntity], description: '약속 테마 목록' })
  async themes(): Promise<ThemeEntity[]> {
    return this.promiseService.themes();
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
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
import { DestinationType, LocationShareType } from './promise.entity';
import { UserEntity } from '../user/user.entity';
import { PromiseService } from './promise.service';
import {
  InputCreatePromise,
  InputUpdatePromise,
  InputUpdateUserStartLocation,
  OutputCreatePromise,
  OutputPromiseListItem,
  OutputUpdatePromise,
} from './promise.dto';
import { ThemeEntity } from './theme.entity';

@ApiTags('Promise')
@ApiBearerAuth()
@Controller('promise')
export class PromiseController {
  constructor(private readonly promiseService: PromiseService) {}

  @Get('list')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'getPromiseList', summary: '약속 목록' })
  @ApiOkResponse({ type: [OutputPromiseListItem], description: '약속 목록' })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  async list(@AuthUser() user: UserEntity): Promise<OutputPromiseListItem[]> {
    return this.promiseService.findAllByUser(user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    operationId: 'createNewPromise',
    summary: '새로운 약속 추가',
  })
  @ApiOkResponse({ type: OutputCreatePromise, description: '약속 추가 성공' })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  @ApiBadRequestResponse({ description: '약속 추가 실패' })
  async promise(
    @AuthUser() user: UserEntity,
    @Body() input: InputCreatePromise
  ): Promise<OutputCreatePromise> {
    this.throwInvalidInputException(input);
    return this.promiseService.create(user.id, input);
  }

  @Patch('start-location')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'updateStartLocation', summary: '출발지 설정' })
  @ApiOkResponse({ description: '출발지 설정 성공' })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  @ApiBadRequestResponse({ description: '출발지 설정 실패' })
  async startLocation(
    @AuthUser() user: UserEntity,
    @Body() input: InputUpdateUserStartLocation
  ): Promise<void> {
    return this.promiseService.updateStartLocation(user.id, input);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'updatePromise', summary: '약속 수정' })
  @ApiOkResponse({ type: OutputCreatePromise, description: '약속 수정 성공' })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  @ApiBadRequestResponse({ description: '약속 수정 실패' })
  async update(
    @AuthUser() user: UserEntity,
    @Body() input: InputUpdatePromise
  ): Promise<OutputUpdatePromise> {
    this.throwInvalidInputException(input);
    return this.promiseService.update(user.id, input);
  }

  @Get('themes')
  @ApiOperation({ operationId: 'themes', summary: '약속 테마 목록' })
  @ApiOkResponse({ type: [ThemeEntity], description: '약속 테마 목록' })
  async themes(): Promise<ThemeEntity[]> {
    return this.promiseService.themes();
  }

  private throwInvalidInputException(
    input: InputCreatePromise | InputUpdatePromise
  ) {
    if (!this.isValidDestinationType(input)) {
      throw new BadRequestException('유효하지 않은 "장소 지정" 값입니다.');
    }

    if (!this.isValidLocationShareType(input)) {
      throw new BadRequestException('유효하지 않은 "위치 공유" 값입니다.');
    }

    if (!this.isValidDestination(input)) {
      throw new BadRequestException('유효하지 않은 "장소" 값입니다.');
    }

    if (!this.isValidTimestamp(input)) {
      throw new BadRequestException('유효하지 않은 "약속 시간" 값입니다.');
    }
  }

  private isValidDestinationType(
    input: InputCreatePromise | InputUpdatePromise
  ): boolean {
    return (
      !!input.destinationType &&
      Object.values(DestinationType).includes(input.destinationType)
    );
  }

  private isValidLocationShareType(
    input: InputCreatePromise | InputUpdatePromise
  ): boolean {
    const isValidStartType =
      !input.locationShareStartType ||
      Object.values(LocationShareType).includes(input.locationShareStartType);
    const isValidEndType =
      !input.locationShareEndType ||
      Object.values(LocationShareType).includes(input.locationShareEndType);
    return isValidStartType && isValidEndType;
  }

  private isValidDestination(
    input: InputCreatePromise | InputUpdatePromise
  ): boolean {
    if (!input.destinationType) return false;
    if (input.destinationType === DestinationType.Dynamic) return true;
    return (
      input.destinationType === DestinationType.Static && !!input.destination
    );
  }

  private isValidTimestamp(
    input: InputCreatePromise | InputUpdatePromise
  ): boolean {
    return (
      input.promisedAt == undefined ||
      (typeof input.promisedAt == 'number' && input.promisedAt > 1000)
    );
  }
}

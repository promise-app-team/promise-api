import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
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
  OutputCheckPromiseQueue,
  OutputCreatePromise,
  OutputPromiseListItem,
} from './promise.dto';
import { ThemeEntity } from './theme.entity';
import { HttpException } from '@/schema/exception';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

@ApiTags('Promise')
@ApiBearerAuth()
@Controller('promises')
export class PromiseController {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly promiseService: PromiseService
  ) {}

  @Get('')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'getPromiseList', summary: '약속 목록' })
  @ApiOkResponse({ type: [OutputPromiseListItem], description: '약속 목록' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  async getMyPromises(
    @AuthUser() user: UserEntity
  ): Promise<OutputPromiseListItem[]> {
    return this.promiseService.findAllByUser(user.id);
  }

  @Get('themes')
  @ApiOperation({ operationId: 'themes', summary: '약속 테마 목록' })
  @ApiOkResponse({ type: [ThemeEntity], description: '약속 테마 목록' })
  async themes(): Promise<ThemeEntity[]> {
    return this.promiseService.themes();
  }

  @Get('queue')
  @ApiOperation({
    operationId: 'checkPromiseQueue',
    summary: '약속 대기열을 확인',
  })
  @ApiOkResponse({
    type: OutputCheckPromiseQueue,
    description: '약속 대기열 확인 성공',
  })
  @ApiNotFoundResponse({ type: HttpException, description: '약속 대기열 없음' })
  async dequeuePromise(@Query('deviceId') deviceId: string) {
    const key = `promise:${deviceId}:queue`;
    const value = await this.redis.get(key);
    if (value !== null) {
      await this.redis.del(key);
      return {
        pid: value,
      };
    }
    throw new NotFoundException('약속 대기열을 찾을 수 없습니다.');
  }

  @Post('queue')
  @ApiOperation({
    operationId: 'enqueuePromise',
    summary: '약속 대기열에 추가',
  })
  @ApiCreatedResponse({ description: '약속 대기열에 추가 성공' })
  @ApiBadRequestResponse({
    type: HttpException,
    description: '약속 대기열 추가 실패',
  })
  @ApiNotFoundResponse({ type: HttpException, description: '약속 없음' })
  async enqueuePromise(
    @Query('pid') pid: string,
    @Query('deviceId') deviceId: string
  ) {
    const exists = await this.promiseService.exists(pid);
    if (!exists) {
      throw new NotFoundException('약속을 찾을 수 없습니다.');
    }
    const key = `promise:${deviceId}:queue`;
    await this.redis.set(key, pid);
    await this.redis.expire(key, 60 * 10);
  }

  @Get(':pid')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'getPromise', summary: '약속 상세 정보' })
  @ApiOkResponse({ type: OutputPromiseListItem, description: '약속 상세 정보' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  @ApiNotFoundResponse({ type: HttpException, description: '약속 없음' })
  async getPromiseDetail(
    @Param('pid') pid: string
  ): Promise<OutputPromiseListItem> {
    return this.promiseService.findOne(pid);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    operationId: 'createNewPromise',
    summary: '새로운 약속 추가',
  })
  @ApiOkResponse({ type: OutputCreatePromise, description: '약속 추가 성공' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  @ApiBadRequestResponse({ type: HttpException, description: '약속 추가 실패' })
  async createNewPromise(
    @AuthUser() user: UserEntity,
    @Body() input: InputCreatePromise
  ): Promise<OutputCreatePromise> {
    this.throwInvalidInputException(input);
    return this.promiseService.create(user.id, input);
  }

  @Put(':pid')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'updatePromise', summary: '약속 수정' })
  @ApiOkResponse({ type: OutputCreatePromise, description: '약속 수정 성공' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  @ApiBadRequestResponse({ type: HttpException, description: '약속 수정 실패' })
  @ApiNotFoundResponse({ type: HttpException, description: '약속 없음' })
  async update(
    @AuthUser() user: UserEntity,
    @Param('pid') pid: string,
    @Body() input: InputUpdatePromise
  ) {
    this.throwInvalidInputException(input);
    await this.promiseService.update(pid, user.id, input);
  }

  @Post(':pid/start-location')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'setStartLocation', summary: '출발지 설정' })
  @ApiOkResponse({ description: '출발지 설정 성공' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  @ApiNotFoundResponse({ type: HttpException, description: '약속 없음' })
  @ApiBadRequestResponse({
    type: HttpException,
    description: '출발지 설정 실패',
  })
  async startLocation(
    @AuthUser() user: UserEntity,
    @Param('pid') pid: string,
    @Body() input: InputUpdateUserStartLocation
  ) {
    await this.promiseService.updateStartLocation(pid, user.id, input);
  }

  @Post(':pid/attend')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'attendPromise', summary: '약속 참여' })
  @ApiOkResponse({ description: '약속 참여 성공' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  @ApiNotFoundResponse({ type: HttpException, description: '약속 없음' })
  @ApiBadRequestResponse({ type: HttpException, description: '약속 참여 실패' })
  async attendPromise(@AuthUser() user: UserEntity, @Param('pid') pid: string) {
    await this.promiseService.attend(pid, user.id);
  }

  @Delete(':pid/attend')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'cancelPromise', summary: '약속 취소' })
  @ApiOkResponse({ description: '약속 취소 성공' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  @ApiNotFoundResponse({ type: HttpException, description: '약속 없음' })
  @ApiBadRequestResponse({ type: HttpException, description: '약속 취소 실패' })
  async cancelPromise(@AuthUser() user: UserEntity, @Param('pid') pid: string) {
    await this.promiseService.cancel(pid, user.id);
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
    if (!input.destinationType) {
      return false;
    }
    if (
      input.destinationType === DestinationType.Dynamic &&
      !input.destination
    ) {
      return true;
    }
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

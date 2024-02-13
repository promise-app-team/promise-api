import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
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
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { AuthUser } from '../auth/auth.decorator';
import { UserEntity } from '../user/user.entity';
import { PromiseService } from './promise.service';
import {
  InputCreatePromise,
  InputUpdatePromise,
  InputUpdateUserStartLocation,
  OutputCheckPromiseQueue,
  OutputCreatePromise,
  OutputPromiseListItem,
  OutputStartLocation,
} from './promise.dto';
import { ThemeEntity } from './theme.entity';
import { HttpException } from '@/schema/exception';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@ApiTags('Promise')
@ApiBearerAuth()
@Controller('promises')
export class PromiseController {
  constructor(
    // @InjectRedis() private readonly redis: Redis,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly promiseService: PromiseService
  ) {}

  @Get('')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'getPromiseList', summary: '약속 목록' })
  @ApiQuery({ name: 'status', enum: ['all', 'available', 'unavailable'] })
  @ApiOkResponse({ type: [OutputPromiseListItem], description: '약속 목록' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  async getMyPromises(
    @AuthUser() user: UserEntity,
    @Query('status') status?: 'all' | 'available' | 'unavailable'
  ): Promise<OutputPromiseListItem[]> {
    return this.promiseService.findAllByUser(user.id, status);
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
    const key = this.makeDeviceKey(deviceId);
    const value = await this.cache.get(key);
    if (value) {
      await this.cache.del(key);
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
    const key = this.makeDeviceKey(deviceId);
    await this.cache.set(key, pid, 60 * 10 * 1000);
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
  @ApiCreatedResponse({
    type: OutputCreatePromise,
    description: '약속 추가 성공',
  })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  @ApiBadRequestResponse({ type: HttpException, description: '약속 추가 실패' })
  async createNewPromise(
    @AuthUser() user: UserEntity,
    @Body() input: InputCreatePromise
  ): Promise<OutputCreatePromise> {
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
    await this.promiseService.update(pid, user.id, input);
  }

  @Get(':pid/start-location')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'getStartLocation', summary: '출발지 확인' })
  @ApiOkResponse({ type: OutputStartLocation, description: '출발지 확인 성공' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  @ApiNotFoundResponse({ type: HttpException, description: '약속/출발지 없음' })
  async startLocationCheck(
    @AuthUser() user: UserEntity,
    @Param('pid') pid: string
  ): Promise<OutputStartLocation> {
    return this.promiseService.getStartLocation(pid, user.id);
  }

  @Post(':pid/start-location')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'setStartLocation', summary: '출발지 설정' })
  @ApiCreatedResponse({ description: '출발지 설정 성공' })
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
  @ApiCreatedResponse({ description: '약속 참여 성공' })
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

  private makeDeviceKey(deviceId: string) {
    const env = process.env.NODE_ENV || 'test';
    return `device:${deviceId}:${env}`;
  }
}

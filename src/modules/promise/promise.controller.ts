import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Get,
  Put,
  Body,
  Post,
  Param,
  Query,
  Delete,
  Inject,
  UseGuards,
  Controller,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiQuery,
  ApiOkResponse,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Cache } from 'cache-manager';

import { AuthUser } from '../auth/auth.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';

import { InputPromiseDTO, PromisePidDTO, PromiseDTO, PublicPromiseDTO, TestDTO, InputLocationDTO } from './promise.dto';

import { LocationDTO } from '@/modules/promise/location.dto';
import { PromiseService } from '@/modules/promise/promise.service';
import { ThemeDTO } from '@/modules/promise/theme.dto';
import { UserEntity } from '@/prisma';
import { HttpException } from '@/schema/exception';

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
  @ApiQuery({ name: 'status', enum: ['all', 'available', 'unavailable'], required: false })
  @ApiOkResponse({ type: [PromiseDTO], description: '약속 목록' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  async getMyPromises(
    @AuthUser() user: UserEntity,
    @Query('status') status: 'all' | 'available' | 'unavailable' = 'all'
  ): Promise<PromiseDTO[]> {
    return this.promiseService
      .findAllByUser(user, status)
      .then((promises) => promises.map((promise) => PromiseDTO.from(promise)));
  }

  @Get('themes')
  @ApiOperation({ operationId: 'themes', summary: '약속 테마 목록' })
  @ApiOkResponse({ type: [ThemeDTO], description: '약속 테마 목록' })
  async findAllThemes(): Promise<ThemeDTO[]> {
    return this.promiseService.themes().then((themes) => themes.map((theme) => ThemeDTO.from(theme)));
  }

  @Get('queue')
  @ApiOperation({ operationId: 'checkPromiseQueue', summary: '약속 대기열을 확인' })
  @ApiOkResponse({ type: PromisePidDTO, description: '약속 대기열 확인 성공' })
  @ApiNotFoundResponse({ type: HttpException, description: '약속 대기열 없음' })
  async dequeuePromise(@Query('deviceId') deviceId: string): Promise<PromisePidDTO> {
    const key = this.makeDeviceKey(deviceId);
    const value = await this.cache.get(key);
    if (value) {
      await this.cache.del(key);
      return {
        pid: `${value}`,
      };
    }
    throw new NotFoundException('약속 대기열을 찾을 수 없습니다.');
  }

  @Post('queue')
  @ApiOperation({ operationId: 'enqueuePromise', summary: '약속 대기열에 추가' })
  @ApiCreatedResponse({ description: '약속 대기열에 추가 성공' })
  @ApiBadRequestResponse({ type: HttpException, description: '약속 대기열 추가 실패' })
  @ApiNotFoundResponse({ type: HttpException, description: '약속 없음' })
  async enqueuePromise(@Query('pid') pid: string, @Query('deviceId') deviceId: string) {
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
  @ApiOkResponse({ type: PublicPromiseDTO, description: '약속 상세 정보' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  @ApiNotFoundResponse({ type: HttpException, description: '약속 없음' })
  async getPromiseDetail(@Param('pid') pid: string): Promise<PublicPromiseDTO> {
    return this.promiseService.findOneByPid(pid).then((promise) => PromiseDTO.from(promise));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'createNewPromise', summary: '새로운 약속 추가' })
  @ApiCreatedResponse({ type: PublicPromiseDTO, description: '약속 추가 성공' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  @ApiBadRequestResponse({ type: HttpException, description: '약속 추가 실패' })
  async createNewPromise(@AuthUser() user: UserEntity, @Body() input: InputPromiseDTO): Promise<PublicPromiseDTO> {
    return this.promiseService
      .create(user, input)
      .then((promises) => {
        console.log(JSON.stringify(promises, null, 2));
        return promises;
      })
      .then((promise) => PublicPromiseDTO.from(promise));
  }

  @Put(':pid')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'updatePromise', summary: '약속 수정' })
  @ApiOkResponse({ type: PublicPromiseDTO, description: '약속 수정 성공' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  @ApiBadRequestResponse({ type: HttpException, description: '약속 수정 실패' })
  @ApiNotFoundResponse({ type: HttpException, description: '약속 없음' })
  async updatePromise(
    @AuthUser() user: UserEntity,
    @Param('pid') pid: string,
    @Body() input: InputPromiseDTO
  ): Promise<PublicPromiseDTO> {
    return this.promiseService.update(pid, user, input).then((promise) => PublicPromiseDTO.from(promise));
  }

  @Post('test')
  async test(@Body() input: TestDTO) {
    return input;
  }

  @Get(':pid/start-location')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'getStartLocation', summary: '출발지 불러오기' })
  @ApiOkResponse({ type: LocationDTO, description: '출발지 불러오기 성공' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  @ApiNotFoundResponse({ type: HttpException, description: '약속/출발지 없음' })
  async getStartLocation(@AuthUser() user: UserEntity, @Param('pid') pid: string): Promise<LocationDTO> {
    return this.promiseService
      .getStartLocation(pid, user)
      .then((location) => LocationDTO.from(location))
      .catch(() => {
        throw new NotFoundException('출발지를 찾을 수 없습니다.');
      });
  }

  @Post(':pid/start-location')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'setStartLocation', summary: '출발지 설정' })
  @ApiCreatedResponse({ type: LocationDTO, description: '출발지 설정 성공' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  @ApiNotFoundResponse({ type: HttpException, description: '약속 없음' })
  @ApiBadRequestResponse({ type: HttpException, description: '출발지 설정 실패' })
  async setStartLocation(@AuthUser() user: UserEntity, @Param('pid') pid: string, @Body() input: InputLocationDTO) {
    return this.promiseService
      .updateStartLocation(pid, user, input)
      .then((location) => LocationDTO.from(location))
      .catch(() => {
        throw new NotFoundException('출발지를 찾을 수 없습니다.');
      });
  }

  @Delete(':pid/start-location')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'deleteStartLocation', summary: '출발지 삭제' })
  @ApiOkResponse({ description: '출발지 삭제 성공' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  @ApiNotFoundResponse({ type: HttpException, description: '약속 없음' })
  @ApiBadRequestResponse({ type: HttpException, description: '출발지 삭제 실패' })
  async deleteStartLocation(@AuthUser() user: UserEntity, @Param('pid') pid: string) {
    await this.promiseService.deleteStartLocation(pid, user);
  }

  @Post(':pid/attend')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'attendPromise', summary: '약속 참여' })
  @ApiCreatedResponse({ type: PromisePidDTO, description: '약속 참여 성공' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  @ApiNotFoundResponse({ type: HttpException, description: '약속 없음' })
  @ApiBadRequestResponse({ type: HttpException, description: '약속 참여 실패' })
  async attendPromise(@AuthUser() user: UserEntity, @Param('pid') pid: string): Promise<PromisePidDTO> {
    return this.promiseService
      .attend(pid, user)
      .then((promise) => PromisePidDTO.from(promise))
      .catch((error) => {
        throw new BadRequestException(error.message);
      });
  }

  @Delete(':pid/attend')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'leavePromise', summary: '약속 탈퇴' })
  @ApiOkResponse({ description: '약속 탈퇴 성공' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  @ApiNotFoundResponse({ type: HttpException, description: '약속 없음' })
  @ApiBadRequestResponse({ type: HttpException, description: '약속 탈퇴 실패' })
  async leavePromise(@AuthUser() user: UserEntity, @Param('pid') pid: string) {
    await this.promiseService.leave(pid, user).catch((error) => {
      throw new BadRequestException(error.message);
    });
  }

  private makeDeviceKey(deviceId: string) {
    const env = process.env.NODE_ENV || 'test';
    return `device:${deviceId}:${env}`;
  }
}

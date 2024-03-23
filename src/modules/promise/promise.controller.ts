import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Body, Param, Query, Inject, Controller, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Cache } from 'cache-manager';
import * as R from 'remeda';

import { HttpException } from '@/common/exceptions/http.exception';
import { ToArrayOfPipe } from '@/common/pipes/to-array-of.pipe';
import { TypedConfigService } from '@/config/env';
import { Delete, Get, Post, Put } from '@/customs/nest/decorators/http-api.decorator';
import { AuthUser } from '@/modules/auth/auth.decorator';
import { LocationDTO, PointDTO } from '@/modules/promise/location.dto';
import {
  InputCreatePromiseDTO,
  InputLocationDTO,
  InputUpdatePromiseDTO,
  PromiseUserRole,
  PromiseDTO,
  PromiseStatus,
  PublicPromiseDTO,
} from '@/modules/promise/promise.dto';
import { EncodePromiseID } from '@/modules/promise/promise.interceptor';
import { DecodePromisePID } from '@/modules/promise/promise.pipe';
import { PromiseService, PromiseServiceError } from '@/modules/promise/promise.service';
import { ThemeDTO } from '@/modules/promise/theme.dto';
import { UserModel } from '@/prisma/prisma.entity';
import { Point, findGeometricMedian } from '@/utils/geometric';

@ApiTags('Promise')
@ApiBearerAuth()
@Controller('promises')
export class PromiseController {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly promiseService: PromiseService,
    private readonly config: TypedConfigService
  ) {}

  @Get('', { auth: true, description: '내가 참여한 약속 목록을 불러옵니다.', exceptions: ['BAD_REQUEST'] })
  @ApiQuery({ name: 'status', enum: PromiseStatus, required: false })
  @ApiQuery({ name: 'role', enum: PromiseUserRole, required: false })
  @UseInterceptors(EncodePromiseID)
  async getMyPromises(
    @AuthUser() user: UserModel,
    @Query('status') status: PromiseStatus = PromiseStatus.ALL,
    @Query('role') role: PromiseUserRole = PromiseUserRole.ALL
  ): Promise<PromiseDTO[]> {
    return this.promiseService
      .findAllByUser(user.id, { status, role })
      .then((promises) => promises.map((promise) => PromiseDTO.from(promise)));
  }

  @Get(':pid(\\d+)', {
    auth: true,
    description: '약속 상세 정보를 불러옵니다.',
    exceptions: ['BAD_REQUEST', 'NOT_FOUND'],
  })
  @UseInterceptors(EncodePromiseID)
  async getPromise(@Param('pid', DecodePromisePID) id: number): Promise<PublicPromiseDTO> {
    return this.promiseService
      .findOneById(id)
      .then((promise) => PublicPromiseDTO.from(promise))
      .catch((error) => {
        switch (error) {
          case PromiseServiceError.NotFoundPromise:
            throw HttpException.new(error, 'NOT_FOUND');
          default:
            throw HttpException.new(error);
        }
      });
  }

  @Post('', { auth: true, description: '약속을 생성합니다.', exceptions: ['BAD_REQUEST'] })
  @UseInterceptors(EncodePromiseID)
  async createPromise(@AuthUser() user: UserModel, @Body() input: InputCreatePromiseDTO): Promise<PublicPromiseDTO> {
    return this.promiseService.create(user.id, input).then((promise) => PublicPromiseDTO.from(promise));
  }

  @Put(':pid(\\d+)', { auth: true, description: '약속을 수정합니다.', exceptions: ['BAD_REQUEST', 'NOT_FOUND'] })
  @UseInterceptors(EncodePromiseID)
  async updatePromise(
    @AuthUser() user: UserModel,
    @Param('pid', DecodePromisePID) id: number,
    @Body() input: InputUpdatePromiseDTO
  ): Promise<PublicPromiseDTO> {
    return this.promiseService
      .update(id, user.id, input)
      .then((promise) => PublicPromiseDTO.from(promise))
      .catch((error) => {
        switch (error) {
          case PromiseServiceError.NotFoundPromise:
            throw HttpException.new(error, 'NOT_FOUND');
          case PromiseServiceError.HostChangeOnly:
            throw HttpException.new(error, 'BAD_REQUEST');
          default:
            throw HttpException.new(error);
        }
      });
  }

  @Post(':pid(\\d+)/attendees', {
    auth: true,
    description: '약속에 참여합니다.',
    exceptions: ['BAD_REQUEST', 'NOT_FOUND'],
  })
  @UseInterceptors(EncodePromiseID)
  async attendPromise(
    @AuthUser() user: UserModel,
    @Param('pid', DecodePromisePID) id: number
  ): Promise<{ id: number }> {
    return this.promiseService
      .attend(id, user.id)
      .then((promise) => ({ id: promise.id }))
      .catch((error) => {
        switch (error) {
          case PromiseServiceError.NotFoundPromise:
            throw HttpException.new(error, 'NOT_FOUND');
          case PromiseServiceError.AlreadyAttend:
            throw HttpException.new(error, 'BAD_REQUEST');
          default:
            throw HttpException.new(error);
        }
      });
  }

  @Delete(':pid(\\d+)/attendees', {
    auth: true,
    description: '약속을 떠납니다.',
    exceptions: ['BAD_REQUEST', 'NOT_FOUND'],
  })
  async leavePromise(@AuthUser() user: UserModel, @Param('pid', DecodePromisePID) id: number) {
    await this.promiseService.leave(id, user.id).catch((error) => {
      switch (error) {
        case PromiseServiceError.NotFoundPromise:
          throw HttpException.new(error, 'NOT_FOUND');
        case PromiseServiceError.HostDoNotCancel:
          throw HttpException.new(error, 'BAD_REQUEST');
        default:
          throw HttpException.new(error);
      }
    });
  }

  @Get(':pid(\\d+)/start-location', {
    auth: true,
    description: '약속 출발지를 불러옵니다.',
    exceptions: ['BAD_REQUEST', 'NOT_FOUND'],
  })
  async getStartLocation(
    @AuthUser() user: UserModel,
    @Param('pid', DecodePromisePID) id: number
  ): Promise<LocationDTO> {
    return this.promiseService
      .getStartLocation(id, user.id)
      .then((location) => LocationDTO.from(location))
      .catch((error) => {
        switch (error) {
          case PromiseServiceError.NotFoundPromise:
          case PromiseServiceError.NotFoundStartLocation:
            throw HttpException.new(error, 'NOT_FOUND');
          default:
            throw HttpException.new(error);
        }
      });
  }

  @Post(':pid(\\d+)/start-location', {
    auth: true,
    description: '약속 출발지를 설정합니다.',
    exceptions: ['BAD_REQUEST', 'NOT_FOUND'],
  })
  async updateStartLocation(
    @AuthUser() user: UserModel,
    @Param('pid', DecodePromisePID) id: number,
    @Body() input: InputLocationDTO
  ) {
    return this.promiseService
      .updateStartLocation(id, user.id, input)
      .then((location) => LocationDTO.from(location))
      .catch((error) => {
        switch (error) {
          case PromiseServiceError.NotFoundPromise:
            throw HttpException.new(error, 'NOT_FOUND');
          default:
            throw HttpException.new(error);
        }
      });
  }

  @Delete(':pid(\\d+)/start-location', {
    auth: true,
    description: '약속 출발지를 삭제합니다.',
    exceptions: ['BAD_REQUEST', 'NOT_FOUND'],
  })
  async deleteStartLocation(@AuthUser() user: UserModel, @Param('pid', DecodePromisePID) id: number): Promise<void> {
    await this.promiseService.deleteStartLocation(id, user.id);
  }

  @Get(':pid(\\d+)/middle-location', {
    auth: true,
    description: '약속 중간지점을 불러옵니다.',
    exceptions: ['BAD_REQUEST', 'NOT_FOUND'],
  })
  @ApiQuery({ name: 'attendeeIds', type: 'number', isArray: true, required: false })
  async getMiddleLocation(
    @AuthUser() user: UserModel,
    @Param('pid', DecodePromisePID) id: number,
    @Query('attendeeIds', new ToArrayOfPipe(Number, { unique: true })) attendeeIds?: number[]
  ): Promise<PointDTO> {
    const exists = await this.promiseService.exists(id, { status: PromiseStatus.AVAILABLE });
    if (!exists) {
      throw HttpException.new('약속을 찾을 수 없습니다.', 'NOT_FOUND');
    }

    const promiseUsers = await this.promiseService.getAttendees(id, attendeeIds);

    const startLocations: Point[] = R.pipe(
      promiseUsers,
      R.map(({ startLocation }) => startLocation),
      R.filter(R.isTruthy),
      R.map((location) => ({
        latitude: parseFloat(`${location.latitude}`),
        longitude: parseFloat(`${location.longitude}`),
      }))
    );

    if (startLocations.length < 2) {
      throw HttpException.new('등록된 출발지가 2개 이상 필요합니다.', 'BAD_REQUEST');
    }

    return findGeometricMedian(startLocations);
  }

  @Get('themes', { auth: true, description: '약속 테마 목록을 불러옵니다.' })
  async getThemes(): Promise<ThemeDTO[]> {
    return this.promiseService
      .getThemes()
      .then((themes) => themes.map((theme) => ThemeDTO.from(theme)))
      .catch((error) => {
        switch (error) {
          case PromiseServiceError.NotFoundPromise:
            throw HttpException.new(error, 'NOT_FOUND');
          default:
            throw HttpException.new(error);
        }
      });
  }

  @Get('queue', { description: '약속 대기열을 확인합니다.', exceptions: ['BAD_REQUEST', 'NOT_FOUND'] })
  @UseInterceptors(EncodePromiseID)
  async dequeuePromise(@Query('deviceId') deviceId: string): Promise<{ id: number }> {
    const key = this.#makeDeviceKey(deviceId);
    const value = await this.cache.get(key);
    if (!!value && typeof +value === 'number') {
      await this.cache.del(key);
      return { id: +value };
    }
    throw HttpException.new('약속 대기열을 찾을 수 없습니다.', 'NOT_FOUND');
  }

  @Post('queue', { description: '약속 대기열에 추가합니다.', exceptions: ['BAD_REQUEST', 'NOT_FOUND'] })
  async enqueuePromise(@Query('pid', DecodePromisePID) id: number, @Query('deviceId') deviceId: string) {
    const exists = await this.promiseService.exists(id, { status: PromiseStatus.AVAILABLE });
    if (!exists) {
      throw HttpException.new('약속을 찾을 수 없습니다.', 'NOT_FOUND');
    }
    const key = this.#makeDeviceKey(deviceId);
    await this.cache.set(key, id, 60 * 10 * 1000);
  }

  #makeDeviceKey(deviceId: string) {
    const env = this.config.get('env');
    return `device:${deviceId}:${env}`;
  }
}

import { Body, Param, Query, Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import * as R from 'remeda';

import { InputLocationDTO, LocationDTO, PointDTO } from '../locations';

import {
  IdentifiableDTO,
  InputCreatePromiseDTO,
  InputUpdatePromiseDTO,
  PromiseDTO,
  PromiseIdentifiableDTO,
  PublicPromiseDTO,
} from './promise.dto';
import { PromiseStatus, PromiseUserRole } from './promise.enum';
import { EncodePromiseID } from './promise.interceptor';
import { DecodePromisePID } from './promise.pipe';
import { PromiseService, PromiseServiceError } from './promise.service';

import { HttpException } from '@/common/exceptions';
import { ToArrayOfPipe } from '@/common/pipes';
import { TypedConfigService } from '@/config/env';
import { CacheService } from '@/customs/cache';
import { Delete, Get, Post, Put } from '@/customs/nest';
import { SqidsService } from '@/customs/sqids/sqids.service';
import { AuthUser } from '@/modules/auth';
import { DestinationType, UserModel } from '@/prisma';
import { Point, findGeometricMedian } from '@/utils';

@ApiTags('Promise')
@ApiBearerAuth()
@Controller('promises')
export class PromiseController {
  constructor(
    private readonly promiseService: PromiseService,
    private readonly config: TypedConfigService,
    private readonly cache: CacheService,
    private readonly sqids: SqidsService
  ) {}

  @Get('', {
    auth: true,
    description: '내가 참여한 약속 목록을 불러옵니다.',
    exceptions: ['BAD_REQUEST'],
    interceptors: [EncodePromiseID],
  })
  @ApiQuery({ name: 'status', enum: PromiseStatus, required: false })
  @ApiQuery({ name: 'role', enum: PromiseUserRole, required: false })
  async getMyPromises<User extends Pick<UserModel, 'id'>>(
    @AuthUser() user: User,
    @Query('status') status: PromiseStatus = PromiseStatus.ALL,
    @Query('role') role: PromiseUserRole = PromiseUserRole.ALL
  ): Promise<PromiseDTO[]> {
    return this.promiseService
      .findAll({ status, role, userId: user.id })
      .then((promises) => promises.map((promise) => PromiseDTO.from(promise)));
  }

  @Get(':pid(\\d+)', {
    auth: true,
    description: '약속 상세 정보를 불러옵니다.',
    exceptions: ['BAD_REQUEST', 'NOT_FOUND'],
    interceptors: [EncodePromiseID],
  })
  async getPromise(@Param('pid', DecodePromisePID) id: number): Promise<PublicPromiseDTO> {
    return this.promiseService
      .findOne({ id })
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

  @Post('', {
    auth: true,
    description: '약속을 생성합니다.',
    exceptions: ['BAD_REQUEST'],
    interceptors: [EncodePromiseID],
  })
  async createPromise<User extends Pick<UserModel, 'id'>>(
    @AuthUser() user: User,
    @Body() input: InputCreatePromiseDTO
  ): Promise<PublicPromiseDTO> {
    return this.promiseService.create(user.id, input).then((promise) => PublicPromiseDTO.from(promise));
  }

  @Put(':pid(\\d+)', {
    auth: true,
    description: '약속을 수정합니다.',
    exceptions: ['BAD_REQUEST', 'NOT_FOUND', 'FORBIDDEN'],
    interceptors: [EncodePromiseID],
  })
  async updatePromise<User extends Pick<UserModel, 'id'>>(
    @AuthUser() user: User,
    @Param('pid', DecodePromisePID) id: number,
    @Body() input: InputUpdatePromiseDTO
  ): Promise<PublicPromiseDTO> {
    const refIds =
      input.destinationType === DestinationType.DYNAMIC && input.middleLocationRef
        ? this.sqids.decode(input.middleLocationRef).slice(0, -1)
        : [];

    return this.promiseService
      .update(id, user.id, { ...input, refIds })
      .then((promise) => PublicPromiseDTO.from(promise))
      .catch((error) => {
        switch (error) {
          case PromiseServiceError.NotFoundPromise:
            throw HttpException.new(error, 'NOT_FOUND');
          case PromiseServiceError.OnlyHostUpdatable:
            throw HttpException.new(error, 'FORBIDDEN');
          default:
            throw HttpException.new(error);
        }
      });
  }

  @Post(':pid(\\d+)/attendees', {
    auth: true,
    description: '약속에 참여합니다.',
    exceptions: ['BAD_REQUEST', 'NOT_FOUND'],
    interceptors: [EncodePromiseID],
    response: PromiseIdentifiableDTO,
  })
  async attendPromise<User extends Pick<UserModel, 'id'>>(
    @AuthUser() user: User,
    @Param('pid', DecodePromisePID) id: number
  ): Promise<{ id: number }> {
    return this.promiseService
      .attend(id, user.id)
      .then((promise) => ({ id: promise.id }))
      .catch((error) => {
        switch (error) {
          case PromiseServiceError.NotFoundPromise:
            throw HttpException.new(error, 'NOT_FOUND');
          case PromiseServiceError.AlreadyAttended:
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
    interceptors: [EncodePromiseID],
    response: PromiseIdentifiableDTO,
  })
  async leavePromise<User extends Pick<UserModel, 'id'>>(
    @AuthUser() user: User,
    @Param('pid', DecodePromisePID) id: number
  ): Promise<{ id: number }> {
    return this.promiseService.leave(id, user.id).catch((error) => {
      switch (error) {
        case PromiseServiceError.NotFoundPromise:
        case PromiseServiceError.NotFoundStartLocation:
          throw HttpException.new(error, 'NOT_FOUND');
        case PromiseServiceError.HostCannotLeave:
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
  async getStartLocation<User extends Pick<UserModel, 'id'>>(
    @AuthUser() user: User,
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

  @Put(':pid(\\d+)/start-location', {
    auth: true,
    description: '약속 출발지를 설정합니다.',
    exceptions: ['BAD_REQUEST', 'NOT_FOUND'],
  })
  async updateStartLocation<User extends Pick<UserModel, 'id'>>(
    @AuthUser() user: User,
    @Param('pid', DecodePromisePID) id: number,
    @Body() input: InputLocationDTO
  ): Promise<LocationDTO> {
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
  async deleteStartLocation<User extends Pick<UserModel, 'id'>>(
    @AuthUser() user: User,
    @Param('pid', DecodePromisePID) id: number
  ): Promise<IdentifiableDTO> {
    return this.promiseService.deleteStartLocation(id, user.id).catch((error) => {
      switch (error) {
        case PromiseServiceError.NotFoundPromise:
        case PromiseServiceError.NotFoundStartLocation:
          throw HttpException.new(error, 'NOT_FOUND');
        default:
          throw HttpException.new(error);
      }
    });
  }

  @Get(':pid(\\d+)/middle-location', {
    auth: true,
    description: '약속 중간지점을 불러옵니다.',
    exceptions: ['BAD_REQUEST', 'NOT_FOUND'],
  })
  @ApiQuery({ name: 'attendeeIds', type: 'number', isArray: true, required: false })
  async getMiddleLocation<User extends Pick<UserModel, 'id'>>(
    @AuthUser() user: User,
    @Param('pid', DecodePromisePID) id: number,
    @Query('attendeeIds', new ToArrayOfPipe(Number, { unique: true })) attendeeIds?: number[]
  ): Promise<PointDTO> {
    const exists = await this.promiseService.exists({ id, status: PromiseStatus.AVAILABLE, userId: user.id });
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

    const median = findGeometricMedian(startLocations);
    const refs = R.map(promiseUsers, R.prop('attendeeId')).concat(Date.now());

    return {
      ref: this.sqids.encode(refs),
      latitude: median.latitude,
      longitude: median.longitude,
    };
  }

  @Put(':pid(\\d+)/delegate', {
    auth: true,
    description: '약속을 위임합니다.',
    exceptions: ['NOT_FOUND'],
    interceptors: [EncodePromiseID],
    response: PromiseIdentifiableDTO,
  })
  async delegatePromise<User extends Pick<UserModel, 'id'>>(
    @AuthUser() user: User,
    @Param('pid', DecodePromisePID) id: number,
    @Query('attendeeId') attendeeId: number
  ): Promise<{ id: number }> {
    return this.promiseService.delegate(id, user.id, attendeeId).catch((error) => {
      switch (error) {
        case PromiseServiceError.NotFoundPromise:
          throw HttpException.new(error, 'NOT_FOUND');
        default:
          throw HttpException.new(error);
      }
    });
  }

  @Put(':pid(\\d+)/complete', {
    auth: true,
    description: '약속을 완료합니다.',
    exceptions: ['NOT_FOUND'],
    interceptors: [EncodePromiseID],
    response: PromiseIdentifiableDTO,
  })
  async completePromise<User extends Pick<UserModel, 'id'>>(
    @AuthUser() user: User,
    @Param('pid', DecodePromisePID) id: number
  ): Promise<{ id: number }> {
    return this.promiseService.complete(id, user.id).catch((error) => {
      switch (error) {
        case PromiseServiceError.NotFoundPromise:
          throw HttpException.new(error, 'NOT_FOUND');
        default:
          throw HttpException.new(error);
      }
    });
  }

  @Post('queue', { description: '약속 대기열에 추가합니다.', exceptions: ['BAD_REQUEST', 'NOT_FOUND'] })
  async enqueuePromise(@Query('pid', DecodePromisePID) id: number, @Query('deviceId') deviceId: string): Promise<void> {
    if (!deviceId) throw HttpException.new('기기 ID를 입력해주세요.', 'BAD_REQUEST');
    const exists = await this.promiseService.exists({ id, status: PromiseStatus.AVAILABLE });
    if (!exists) throw HttpException.new('약속을 찾을 수 없습니다.', 'NOT_FOUND');
    const key = this.#makeDeviceKey(deviceId);
    await this.cache.set(key, id, { ttl: 60 * 10 });
  }

  @Get('queue', {
    description: '약속 대기열을 확인합니다.',
    exceptions: ['BAD_REQUEST', 'NOT_FOUND'],
    interceptors: [EncodePromiseID],
    response: PromiseIdentifiableDTO,
  })
  async dequeuePromise(@Query('deviceId') deviceId: string): Promise<{ id: number }> {
    const key = this.#makeDeviceKey(deviceId);
    const id = Number(await this.cache.get(key));
    if (!R.isNumber(id) || id <= 0) {
      throw HttpException.new('약속 대기열을 찾을 수 없습니다.', 'NOT_FOUND');
    }
    const exists = await this.promiseService.exists({ id, status: PromiseStatus.AVAILABLE });
    if (!exists) throw HttpException.new('약속을 찾을 수 없습니다.', 'NOT_FOUND');
    await this.cache.del(key);
    return { id: +id };
  }

  #makeDeviceKey(deviceId: string) {
    const env = this.config.get('env');
    return `device:${deviceId}:${env}`;
  }
}

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Body, Param, Query, Inject, Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Cache } from 'cache-manager';

import { HttpException } from '@/common';
import { Delete, Get, Post, Put } from '@/customs/nest';
import { AuthUser } from '@/modules/auth/auth.decorator';
import { LocationDTO } from '@/modules/promise/location.dto';
import {
  InputCreatePromiseDTO,
  InputLocationDTO,
  InputUpdatePromiseDTO,
  PromiseUserRole,
  PromiseDTO,
  PromisePidDTO,
  PromiseStatus,
  PublicPromiseDTO,
} from '@/modules/promise/promise.dto';
import { PromiseService, PromiseServiceError } from '@/modules/promise/promise.service';
import { ThemeDTO } from '@/modules/promise/theme.dto';
import { UserEntity } from '@/prisma';

@ApiTags('Promise')
@ApiBearerAuth()
@Controller('promises')
export class PromiseController {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly promiseService: PromiseService
  ) {}

  @Get('', { auth: true, description: '내가 참여한 약속 목록을 불러옵니다.', exceptions: ['BAD_REQUEST'] })
  @ApiQuery({ name: 'status', enum: PromiseStatus, required: false })
  @ApiQuery({ name: 'role', enum: PromiseUserRole, required: false })
  async getMyPromises(
    @AuthUser() user: UserEntity,
    @Query('status') status: PromiseStatus = PromiseStatus.ALL,
    @Query('role') role: PromiseUserRole = PromiseUserRole.ALL
  ): Promise<PromiseDTO[]> {
    return this.promiseService
      .findAllByUser(user, { status, role })
      .then((promises) => promises.map((promise) => PromiseDTO.from(promise)));
  }

  @Get(':pid', { auth: true, description: '약속 상세 정보를 불러옵니다.', exceptions: ['BAD_REQUEST', 'NOT_FOUND'] })
  async getPromise(@Param('pid') pid: string): Promise<PublicPromiseDTO> {
    return this.promiseService
      .findOneByPid(pid)
      .then((promise) => PromiseDTO.from(promise))
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
  async createPromise(@AuthUser() user: UserEntity, @Body() input: InputCreatePromiseDTO): Promise<PublicPromiseDTO> {
    return this.promiseService.create(user, input).then((promise) => PublicPromiseDTO.from(promise));
  }

  @Put(':pid', { auth: true, description: '약속을 수정합니다.', exceptions: ['BAD_REQUEST', 'NOT_FOUND'] })
  async updatePromise(
    @AuthUser() user: UserEntity,
    @Param('pid') pid: string,
    @Body() input: InputUpdatePromiseDTO
  ): Promise<PublicPromiseDTO> {
    return this.promiseService.update(pid, user, input).then((promise) => PublicPromiseDTO.from(promise));
  }

  @Post(':pid/attendees', { auth: true, description: '약속에 참여합니다.', exceptions: ['BAD_REQUEST', 'NOT_FOUND'] })
  async attendPromise(@AuthUser() user: UserEntity, @Param('pid') pid: string): Promise<PromisePidDTO> {
    return this.promiseService.attend(pid, user).then((promise) => PromisePidDTO.from(promise));
  }

  @Delete(':pid/attendees', { auth: true, description: '약속을 떠납니다.', exceptions: ['BAD_REQUEST', 'NOT_FOUND'] })
  async leavePromise(@AuthUser() user: UserEntity, @Param('pid') pid: string) {
    await this.promiseService.leave(pid, user);
  }

  @Get(':pid/start-location', {
    auth: true,
    description: '약속 출발지를 불러옵니다.',
    exceptions: ['BAD_REQUEST', 'NOT_FOUND'],
  })
  async getStartLocation(@AuthUser() user: UserEntity, @Param('pid') pid: string): Promise<LocationDTO> {
    return this.promiseService
      .getStartLocation(pid, user)
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

  @Post(':pid/start-location', {
    auth: true,
    description: '약속 출발지를 설정합니다.',
    exceptions: ['BAD_REQUEST', 'NOT_FOUND'],
  })
  async setStartLocation(@AuthUser() user: UserEntity, @Param('pid') pid: string, @Body() input: InputLocationDTO) {
    return this.promiseService
      .updateStartLocation(pid, user, input)
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

  @Delete(':pid/start-location', {
    auth: true,
    description: '약속 출발지를 삭제합니다.',
    exceptions: ['BAD_REQUEST', 'NOT_FOUND'],
  })
  async deleteStartLocation(@AuthUser() user: UserEntity, @Param('pid') pid: string): Promise<void> {
    await this.promiseService.deleteStartLocation(pid, user);
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
  async dequeuePromise(@Query('deviceId') deviceId: string): Promise<PromisePidDTO> {
    const key = this.#makeDeviceKey(deviceId);
    const value = await this.cache.get(key);
    if (value) {
      await this.cache.del(key);
      return { pid: `${value}` };
    }
    HttpException.throw('약속 대기열을 찾을 수 없습니다.', 'NOT_FOUND');
  }

  @Post('queue', { description: '약속 대기열에 추가합니다.', exceptions: ['BAD_REQUEST', 'NOT_FOUND'] })
  async enqueuePromise(@Query('pid') pid: string, @Query('deviceId') deviceId: string) {
    const exists = await this.promiseService.exists(pid);
    if (!exists) {
      HttpException.throw('약속을 찾을 수 없습니다.', 'NOT_FOUND');
    }
    const key = this.#makeDeviceKey(deviceId);
    await this.cache.set(key, pid, 60 * 10 * 1000);
  }

  #makeDeviceKey(deviceId: string) {
    const env = process.env.NODE_ENV || 'test';
    return `device:${deviceId}:${env}`;
  }
}

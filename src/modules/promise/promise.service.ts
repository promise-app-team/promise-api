import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DestinationType,
  PromiseEntity,
  PromiseUserEntity,
} from './promise.entity';
import { PromiseThemeEntity, ThemeEntity } from './theme.entity';
import { LocationEntity } from './location.entity';
import {
  InputCreatePromise,
  InputUpdatePromise,
  OutputCreatePromise,
  OutputPromiseListItem,
  OutputUpdatePromise,
} from './promise.dto';
import { UserEntity } from '../user/user.entity';

@Injectable()
export class PromiseService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(PromiseEntity)
    private readonly promiseRepo: Repository<PromiseEntity>,
    @InjectRepository(PromiseUserEntity)
    private readonly promiseUserRepo: Repository<PromiseUserEntity>,
    @InjectRepository(ThemeEntity)
    private readonly themeRepo: Repository<ThemeEntity>,
    @InjectRepository(PromiseThemeEntity)
    private readonly promiseThemeRepo: Repository<PromiseThemeEntity>,
    @InjectRepository(LocationEntity)
    private readonly locationRepo: Repository<LocationEntity>,
  ) {}

  async findAllByUser(userId: number): Promise<OutputPromiseListItem[]> {
    const promiseUsers = await this.promiseUserRepo.find({ where: { userId } });
    const promiseIds = promiseUsers.map((user) => user.promiseId);
    const promises = await this.promiseRepo.find({
      where: { id: In(promiseIds) },
    });

    for (const promise of promises) {
      if (promise.destinationId) {
        promise['destination'] = await this.locationRepo.findOne({
          where: { id: promise.destinationId },
        });
      }
    }

    return Promise.all(
      promises.map(async (promise) => {
        const result: OutputPromiseListItem = {
          ...promise,
          host: { username: '' },
          destination: null,
          attendees: [],
        };
        delete result['hostId'];
        delete result['destinationId'];
        if (promise.destinationId) {
          const [host, destination, promiseUsers] = await Promise.all([
            this.userRepo.findOne({ where: { id: promise.hostId } }),
            this.locationRepo.findOne({ where: { id: promise.destinationId } }),
            this.promiseUserRepo.find({ where: { promiseId: promise.id } }),
          ]);
          result.host.username = host?.username ?? 'Unknown';
          result.destination = destination ?? null;
          result.attendees = await Promise.all(
            promiseUsers
              .filter(({ userId }) => userId !== promise.hostId)
              .map(async ({ userId }) => {
                const user = await this.userRepo.findOne({
                  where: { id: userId },
                });
                return { username: user?.username ?? 'Unknown' };
              }),
          );
        }
        return result;
      }),
    );
  }

  async create(
    hostId: number,
    input: InputCreatePromise,
  ): Promise<OutputCreatePromise> {
    return this.dataSource.transaction(async (em) => {
      // TODO: inviteLink 생성
      const inviteLink = 'https://www.google.com';
      let destinationId: number | undefined;
      if (input.destination) {
        const destination = await em.save(
          this.locationRepo.create({ ...input.destination }),
        );
        destinationId = destination.id;
      }

      const promise = await em.save(
        this.promiseRepo.create({
          ...input,
          hostId,
          inviteLink,
          destinationId,
        }),
      );

      const themes = await em.find(ThemeEntity, {
        where: { id: In(input.themeIds) },
      });
      await em.save([
        this.promiseUserRepo.create({
          userId: hostId,
          promiseId: promise.id,
        }),
        ...themes.map((theme) =>
          this.promiseThemeRepo.create({
            themeId: theme.id,
            promiseId: promise.id,
          }),
        ),
      ]);

      return {
        id: promise.id,
        inviteLink,
      };
    });
  }

  async update(
    hostId: number,
    input: InputUpdatePromise,
  ): Promise<OutputUpdatePromise> {
    return this.dataSource.transaction(async (em) => {
      const promise = await em.findOne(PromiseEntity, {
        where: { id: input.id, hostId },
      });

      if (!promise) {
        throw new BadRequestException(`해당 약속을 찾을 수 없습니다.`);
      }

      switch (input.destinationType) {
        case DestinationType.Static:
          const destination = promise.destinationId
            ? await em.findOne(LocationEntity, {
                where: { id: promise.destinationId },
              })
            : null;

          if (destination) {
            await em.save(
              em.merge(LocationEntity, destination, { ...input.destination }),
            );
          } else {
            await em.save(this.locationRepo.create({ ...input.destination }));
          }
          break;
        case DestinationType.Dynamic:
          await em.delete(LocationEntity, { id: promise.destinationId });
          await em.save(
            em.merge(PromiseEntity, promise, { destinationId: undefined }),
          );
          break;
      }

      if (input.themeIds && input.themeIds.length > 0) {
        const themes = await em.find(ThemeEntity, {
          where: { id: In(input.themeIds) },
        });
        await em.delete(PromiseThemeEntity, { promiseId: promise.id });
        await em.save(
          themes.map((theme) =>
            this.promiseThemeRepo.create({
              themeId: theme.id,
              promiseId: promise.id,
            }),
          ),
        );
      }

      return em.save(this.promiseRepo.merge(promise, { ...input }));
    });
  }

  async themes(): Promise<ThemeEntity[]> {
    return this.themeRepo.find();
  }
}

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
  OutputUpdatePromise,
} from './promise.dto';
import { getUnixTime } from 'date-fns';

@Injectable()
export class PromiseService {
  constructor(
    private readonly dataSource: DataSource,
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
          promisedAt: getUnixTime(input.promisedAt),
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

      if (input.destination) {
        const destination = await em.findOne(LocationEntity, {
          where: { id: promise.destinationId },
        });
        if (destination) {
          await em.save(
            em.merge(LocationEntity, destination, { ...input.destination }),
          );
        } else {
          await em.save(this.locationRepo.create({ ...input.destination }));
        }
      } else if (input.destinationType === DestinationType.Dynamic) {
        await em.delete(LocationEntity, { id: promise.destinationId });
        await em.save(
          em.merge(PromiseEntity, promise, { destinationId: null }),
        );
      }

      if (input.themeIds && input.themeIds?.length > 0) {
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

      return em.save(
        this.promiseRepo.merge(promise, {
          ...input,
          promisedAt: input.promisedAt
            ? getUnixTime(input.promisedAt)
            : undefined,
        }),
      );
    });
  }

  async themes(): Promise<ThemeEntity[]> {
    return this.themeRepo.find();
  }
}

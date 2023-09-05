import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PromiseEntity, PromiseUserEntity } from './promise.entity';
import { PromiseThemeEntity, ThemeEntity } from './theme.entity';
import { LocationEntity } from './location.entity';
import { InputCreatePromise, OutputCreatePromise } from './promise.dto';
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
          this.locationRepo.create({
            city: input.destination.city,
            district: input.destination.district,
            address: input.destination.address,
            latitude: input.destination.latitude,
            longitude: input.destination.longitude,
          }),
        );
        destinationId = destination.id;
      }

      const promise = await em.save(
        this.promiseRepo.create({
          hostId,
          title: input.title,
          destinationType: input.destinationType,
          destinationId,
          inviteLink,
          locationShareStartType: input.locationShareStartType,
          locationShareStartValue: input.locationShareStartValue,
          locationShareEndType: input.locationShareEndType,
          locationShareEndValue: input.locationShareEndValue,
          promisedAt: getUnixTime(input.promisedAt),
        }),
      );

      await em.save([
        this.promiseUserRepo.create({
          userId: hostId,
          promiseId: promise.id,
        }),
        ...input.themeIds.map((themeId) =>
          this.promiseThemeRepo.create({
            themeId: +themeId,
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

  async themes(): Promise<ThemeEntity[]> {
    return this.themeRepo.find();
  }
}

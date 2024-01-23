import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  InputUpdateUserStartLocation as InputUpdateUserStartLocation,
  OutputCreatePromise,
  OutputPromiseListItem,
  OutputUpdatePromise,
} from './promise.dto';
import { UserEntity } from '../user/user.entity';
import { HasherService } from '../common/services/HasherService.service';

@Injectable()
export class PromiseService {
  constructor(
    private readonly dataSource: DataSource,

    @Inject(HasherService)
    private readonly hasher: HasherService,

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
    private readonly locationRepo: Repository<LocationEntity>
  ) {}

  async findAllByUser(userId: number): Promise<OutputPromiseListItem[]> {
    const promiseUsers = await this.promiseUserRepo.find({ where: { userId } });
    const promises = await this.promiseRepo.find({
      where: { id: In(promiseUsers.map(({ promiseId }) => promiseId)) },
    });

    return Promise.all(promises.map(this.transformPromise.bind(this)));
  }

  async findOne(pid: string): Promise<OutputPromiseListItem> {
    const id = +this.hasher.decode(pid);
    const promise = await this.promiseRepo.findOne({ where: { id } });
    if (!promise) {
      throw new NotFoundException(`해당 약속을 찾을 수 없습니다.`);
    }
    return this.transformPromise(promise);
  }

  private async transformPromise(
    promise: PromiseEntity
  ): Promise<OutputPromiseListItem> {
    const result: OutputPromiseListItem = {
      ...promise,
      pid: this.hasher.encode(promise.id),
      themes: [],
      host: { id: 0, username: '' },
      destination: null,
      attendees: [],
    };

    Reflect.deleteProperty(result, 'id');
    Reflect.deleteProperty(result, 'hostId');
    Reflect.deleteProperty(result, 'destinationId');

    const [themes, host, promiseUsers] = await Promise.all([
      this.promiseThemeRepo.find({ where: { promiseId: promise.id } }),
      this.userRepo.findOneOrFail({
        where: { id: promise.hostId },
        select: ['id', 'username'],
      }),
      this.promiseUserRepo.find({ where: { promiseId: promise.id } }),
    ]);

    result.themes = (
      await this.themeRepo.find({
        where: { id: In(themes.map(({ themeId }) => themeId)) },
        select: ['theme'],
      })
    ).map(({ theme }) => theme);

    result.host = host;

    const attendeeIds = promiseUsers
      .filter(({ userId }) => userId !== promise.hostId)
      .map(({ userId }) => userId);

    result.attendees = await this.userRepo.find({
      where: { id: In(attendeeIds) },
      select: ['id', 'username'],
    });

    if (promise.destinationId) {
      result.destination = await this.locationRepo.findOne({
        where: { id: promise.destinationId },
      });
    }

    return result;
  }

  async create(
    hostId: number,
    input: InputCreatePromise
  ): Promise<OutputCreatePromise> {
    return this.dataSource.transaction(async (em) => {
      // TODO: inviteLink 생성
      const inviteLink = 'https://www.google.com';
      let destinationId: number | undefined;
      if (input.destination) {
        const destination = await em.save(
          em.create(LocationEntity, { ...input.destination })
        );
        destinationId = destination.id;
      }

      const promise = await em.save(
        em.create(PromiseEntity, {
          ...input,
          hostId,
          inviteLink,
          destinationId,
        })
      );

      const themes = await em.find(ThemeEntity, {
        where: { id: In(input.themeIds) },
      });
      await em.save([
        em.create(PromiseUserEntity, {
          userId: hostId,
          promiseId: promise.id,
        }),
        ...themes.map((theme) =>
          em.create(PromiseThemeEntity, {
            themeId: theme.id,
            promiseId: promise.id,
          })
        ),
      ]);

      return {
        pid: this.hasher.encode(promise.id),
        inviteLink,
      };
    });
  }

  async update(
    pid: string,
    hostId: number,
    input: InputUpdatePromise
  ): Promise<OutputUpdatePromise> {
    return this.dataSource.transaction(async (em) => {
      const id = +this.hasher.decode(pid);
      const promise = await em.findOne(PromiseEntity, {
        where: { id, hostId },
      });

      if (!promise) {
        throw new NotFoundException(`해당 약속을 찾을 수 없습니다.`);
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
              em.merge(LocationEntity, destination, { ...input.destination })
            );
          } else {
            await em.save(em.create(LocationEntity, { ...input.destination }));
          }
          break;
        case DestinationType.Dynamic:
          await em.delete(LocationEntity, { id: promise.destinationId });
          await em.save(
            em.merge(PromiseEntity, promise, { destinationId: undefined })
          );
          break;
      }

      if (input.themeIds?.length) {
        const themes = await em.find(ThemeEntity, {
          where: { id: In(input.themeIds) },
        });
        await em.delete(PromiseThemeEntity, { promiseId: promise.id });
        await em.save(
          themes.map((theme) =>
            em.create(PromiseThemeEntity, {
              themeId: theme.id,
              promiseId: promise.id,
            })
          )
        );
      }

      await em.save(this.promiseRepo.merge(promise, { ...input }));
      return { pid };
    });
  }

  async updateStartLocation(
    pid: string,
    userId: number,
    input: InputUpdateUserStartLocation
  ) {
    const id = +this.hasher.decode(pid);
    const promiseUser = await this.promiseUserRepo.findOne({
      where: { userId, promiseId: id },
    });

    if (!promiseUser) {
      throw new BadRequestException(`해당 약속을 찾을 수 없습니다.`);
    }

    await this.dataSource.transaction(async (em) => {
      const location = promiseUser.startLocationId
        ? await em.findOne(LocationEntity, {
            where: { id: promiseUser.startLocationId },
          })
        : null;

      if (location) {
        await em.save(em.merge(LocationEntity, location, { ...input }));
        promiseUser.startLocationId = location.id;
      } else {
        const { id } = await em.save(em.create(LocationEntity, { ...input }));
        promiseUser.startLocationId = id;
      }

      await em.save(promiseUser);
    });
  }

  async themes(): Promise<ThemeEntity[]> {
    return this.themeRepo.find();
  }
}

import { Injectable } from '@nestjs/common';
import { DeepPartial, Repository } from 'typeorm';
import { Provider, UserEntity } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { getUnixTime } from 'date-fns';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>
  ) {}

  async findOneById(id: string) {
    return this.userRepo.findOneBy({ id: +id });
  }

  async findOneByProvider(provider: Provider, providerId: string) {
    return this.userRepo.findOneBy({ provider, providerId });
  }

  async create(user: DeepPartial<UserEntity>) {
    return this.userRepo.create(user);
  }

  async update(user: UserEntity, update: DeepPartial<UserEntity>) {
    return this.userRepo.save(this.userRepo.merge(user, update));
  }

  async login(user: UserEntity): Promise<UserEntity> {
    return this.userRepo.save(
      this.userRepo.merge(user, {
        lastSignedAt: getUnixTime(new Date()),
      })
    );
  }

  async delete(user: UserEntity, reason: string) {
    return this.userRepo.save(
      this.userRepo.merge(user, {
        deletedAt: getUnixTime(new Date()),
        leaveReason: reason,
        providerId: null,
      })
    );
  }
}

import { Injectable } from '@nestjs/common';
import { DeepPartial, IsNull, Repository } from 'typeorm';
import { Provider, UserEntity } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>
  ) {}

  async findOneById(id: string) {
    return this.userRepo.findOneBy({
      id: +id,
      deletedAt: IsNull(),
    });
  }

  async findOneByProvider(provider: Provider, providerId: string) {
    return this.userRepo.findOneBy({
      provider,
      providerId,
      deletedAt: IsNull(),
    });
  }

  async create(user: DeepPartial<UserEntity>) {
    user.profileUrl ||= `${~~(Math.random() * 10)}`;
    return this.userRepo.create(user);
  }

  async update(user: UserEntity, update: DeepPartial<UserEntity>) {
    user.profileUrl ||= `${~~(Math.random() * 10)}`;
    return this.userRepo.save(this.userRepo.merge(user, update));
  }

  async login(user: UserEntity): Promise<UserEntity> {
    return this.userRepo.save(
      this.userRepo.merge(user, {
        lastSignedAt: new Date(),
      })
    );
  }

  async delete(user: UserEntity, reason: string) {
    return this.userRepo.save(
      this.userRepo.merge(user, {
        deletedAt: new Date(),
        leaveReason: reason,
        providerId: null,
      })
    );
  }
}

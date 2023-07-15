import { Injectable } from '@nestjs/common';
import { DeepPartial, Repository } from 'typeorm';
import { Provider, User } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { getUnixTime } from 'date-fns';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findOneById(id: string) {
    return this.userRepo.findOneBy({ id: +id });
  }

  async findOneByProvider(provider: Provider, providerId: string) {
    return this.userRepo.findOneBy({ provider, providerId });
  }

  async create(user: DeepPartial<User>) {
    return this.userRepo.create(user);
  }

  async login(user: User): Promise<User> {
    return this.userRepo.save(
      this.userRepo.merge(user, {
        lastSignedAt: getUnixTime(new Date()),
      }),
    );
  }

  async delete(user: User) {
    return this.userRepo.save(
      this.userRepo.merge(user, {
        deletedAt: getUnixTime(new Date()),
      }),
    );
  }
}

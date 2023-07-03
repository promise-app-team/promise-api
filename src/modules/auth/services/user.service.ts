import { Injectable } from '@nestjs/common';
import { DeepPartial, Repository } from 'typeorm';
import { Provider, User } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';

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
    return this.userRepo.save(this.userRepo.create(user));
  }
}

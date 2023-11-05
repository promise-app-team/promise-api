import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromiseEntity, PromiseUserEntity } from './promise.entity';
import { PromiseController } from './promise.controller';
import { UserService } from '../user/user.service';
import { UserEntity } from '../user/user.entity';
import { PromiseService } from './promise.service';
import { PromiseThemeEntity, ThemeEntity } from './theme.entity';
import { LocationEntity } from './location.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      ThemeEntity,
      LocationEntity,
      PromiseEntity,
      PromiseUserEntity,
      PromiseThemeEntity,
    ]),
  ],
  controllers: [PromiseController],
  providers: [UserService, PromiseService],
})
export class PromiseModule {}

import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './controllers/auth.controller';
import { UserService } from './services/user.service';
import { UserEntity } from './entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './services/auth.service';
import { UserController } from './controllers/user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [AuthController, UserController],
  providers: [AuthService, UserService, ConfigService, JwtService],
})
export class AuthModule {}

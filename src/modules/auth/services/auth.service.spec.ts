import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { JwtService } from '@nestjs/jwt';
import { Provider, User } from '../entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';

describe('AuthService', () => {
  let app: INestApplication;
  let authService: AuthService;

  function TypeOrmTestingModule(entities: any[]) {
    return TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities,
    });
  }

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TypeOrmTestingModule([User]), TypeOrmModule.forFeature([User])],
      providers: [AuthService, UserService, ConfigService, JwtService],
    }).compile();
    authService = module.get(AuthService);
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  test('should be defined', () => {
    expect(authService).toBeDefined();
  });

  test('authenticate:success', async () => {
    const user = await authService.authenticate({
      username: 'test',
      provider: Provider.Kakao,
      providerId: '1234',
      profileUrl: 'https://imgur.com/syIiU8C',
    });

    expect(user).toHaveProperty('accessToken');
    expect(user).toHaveProperty('refreshToken');
  });

  test('authenticate:fail', async () => {
    await expect(
      authService.authenticate({
        username: 'test',
        provider: Provider.Kakao,
        profileUrl: 'https://imgur.com/syIiU8C',
      }),
    ).rejects.toThrowError();

    await expect(
      authService.authenticate({
        username: 'test',
        providerId: '1234',
        profileUrl: 'https://imgur.com/syIiU8C',
      }),
    ).rejects.toThrowError();
  });

  test('refresh', async () => {
    const user = await authService.authenticate({
      username: 'test',
      provider: Provider.Kakao,
      providerId: '1234',
      profileUrl: 'https://imgur.com/syIiU8C',
    });

    const token = await authService.refresh(user.refreshToken);

    expect(token).toHaveProperty('accessToken');
    expect(token).toHaveProperty('refreshToken');
  });

  test('refresh', async () => {
    const user = await authService.authenticate({
      username: 'test',
      provider: Provider.Kakao,
      providerId: '1234',
      profileUrl: 'https://imgur.com/syIiU8C',
    });

    const token = await authService.refresh(user.refreshToken);

    expect(token).toHaveProperty('accessToken');
    expect(token).toHaveProperty('refreshToken');
  });
});

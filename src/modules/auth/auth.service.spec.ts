import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { UserService } from '../user/user.service';
import { InputCreateUser } from '../user/user.dto';

describe('AuthService', () => {
  let authService: AuthService;
  let mockDataSource: Partial<DataSource>;
  let mockUserService: Partial<UserService>;
  let mockConfigService: Partial<ConfigService>;
  let mockJwtService: Partial<JwtService>;

  beforeEach(async () => {
    mockDataSource = {
      transaction: jest.fn(),
    };
    mockUserService = {
      findOneByProvider: jest.fn(),
      create: jest.fn(),
      login: jest.fn(),
      findOneById: jest.fn(),
    };
    mockConfigService = {
      get: jest.fn(),
    };
    mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: UserService, useValue: mockUserService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('authenticate', () => {
    test("should throw BadRequestException if user doesn't have provider or providerId", async () => {
      const user = new InputCreateUser();
      await expect(authService.authenticate(user)).rejects.toThrow(
        '로그인을 실패했습니다.'
      );
    });
  });
});

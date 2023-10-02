import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { Provider, UserEntity } from './user.entity';

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepo: Partial<Repository<UserEntity>>;

  beforeEach(async () => {
    mockUserRepo = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      merge: jest.fn(),
      save: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(UserEntity), useValue: mockUserRepo },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
  });

  describe('findOneById', () => {
    test('should return a user', async () => {
      const user = new UserEntity();
      jest.spyOn(mockUserRepo, 'findOneBy').mockResolvedValue(user);
      expect(await userService.findOneById('1')).toBe(user);
    });

    test('should return null if user not found', async () => {
      jest.spyOn(mockUserRepo, 'findOneBy').mockResolvedValue(null);
      expect(await userService.findOneById('1')).toBe(null);
    });
  });

  describe('findOneByProvider', () => {
    test('should return a user', async () => {
      const user = new UserEntity();
      jest.spyOn(mockUserRepo, 'findOneBy').mockResolvedValue(user);
      expect(await userService.findOneByProvider(Provider.Google, '1')).toBe(
        user
      );
    });
  });

  describe('create', () => {
    test('should return a user', async () => {
      const user = new UserEntity();
      jest.spyOn(mockUserRepo, 'create').mockReturnValue(user);
      expect(await userService.create(user)).toBe(user);
    });
  });

  describe('login', () => {
    test('should return a user', async () => {
      const user = new UserEntity();
      jest.spyOn(mockUserRepo, 'merge').mockReturnValue(user);
      jest.spyOn(mockUserRepo, 'save').mockResolvedValue(user);
      expect(await userService.login(user)).toBe(user);
    });
  });
});

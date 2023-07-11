import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from './user.service';
import { JwtService } from '@nestjs/jwt';
import { InputCreateUser } from '../dtos/user.dto';
import { DataSource } from 'typeorm';
import { AuthToken } from '../dtos/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async authenticate(user: InputCreateUser): Promise<AuthToken> {
    if (!user.provider || !user.providerId) {
      throw new BadRequestException('로그인을 실패했습니다.');
    }

    const node = await this.dataSource.transaction(async (em) => {
      const node = await this.userService
        .findOneByProvider(user.provider, user.providerId)
        .then((node) => node ?? this.userService.create(user))
        .then((node) => this.userService.login(node));

      return em.save(node);
    });

    return this._generateToken({ id: `${node.id}` });
  }

  async refresh(token: string): Promise<AuthToken> {
    // TODO: AuthToken 모듈로 분리
    const payload = this.jwtService.verify(token, {
      secret: this.configService.get('JWT_SECRET_KEY'),
    });
    const node = await this.userService.findOneById(payload.id);
    if (!node) {
      throw new BadRequestException('로그인을 실패했습니다.');
    }
    return this._generateToken({ id: `${node.id}` });
  }

  // TODO: AuthToken 모듈로 분리
  async _generateToken(payload: object) {
    const secret = this.configService.get('JWT_SECRET_KEY');
    const accessToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });
    return { accessToken, refreshToken };
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { TypedConfigService } from '@/common';
import { AuthTokenDTO } from '@/modules/auth/auth.dto';
import { InputCreateUserDTO } from '@/modules/user/user.dto';
import { UserService } from '@/modules/user/user.service';
import { PrismaService } from '@/prisma';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly user: UserService,
    private readonly config: TypedConfigService,
    private readonly jwt: JwtService
  ) {}

  async authenticate(input: InputCreateUserDTO): Promise<AuthTokenDTO> {
    const { provider, providerId } = input;
    const signedUser = await this.prisma.user.upsert({
      where: { identifier: { provider, providerId } },
      update: { lastSignedAt: new Date() },
      create: input,
    });

    return this._generateToken({ id: `${signedUser.id}` });
  }

  async refresh(token: string): Promise<AuthTokenDTO> {
    // TODO: AuthToken 모듈로 분리
    try {
      const payload = this.jwt.verify(token);
      const node = await this.user.findOneById(payload.id);
      if (!node) throw new Error('로그인을 실패했습니다.');
      return this._generateToken({ id: `${node.id}` });
    } catch (error) {
      if (error instanceof Error) {
        switch (error.name) {
          case 'TokenExpiredError':
            throw new BadRequestException('토큰이 만료되었습니다.');
          case 'JsonWebTokenError':
            throw new BadRequestException('토큰이 유효하지 않습니다.');
        }
      }
      throw new BadRequestException('예상치 못한 오류가 발생했습니다.');
    }
  }

  // TODO: AuthToken 모듈로 분리
  async _generateToken(payload: object) {
    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('jwt.expires.access'),
    });
    const refreshToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('jwt.expires.refresh'),
    });
    return { accessToken, refreshToken };
  }
}

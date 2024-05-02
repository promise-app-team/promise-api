import { CanActivate, ExecutionContext, Injectable, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthTokenService } from './jwt-token.service';

import { HttpException } from '@/common/exceptions';
import { UserService } from '@/modules/user/user.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly userService: UserService,
    private readonly jwt: JwtAuthTokenService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.getToken(request);
    if (!token) throw HttpException.new('로그인이 필요합니다.', 'UNAUTHORIZED');

    try {
      const payload = this.jwt.verifyAccessToken(token);
      request.user = await this.userService.findOneById(payload.sub);
    } catch (error) {
      throw HttpException.new('로그인이 필요합니다..', 'UNAUTHORIZED');
    }
    return true;
  }

  private getToken(request: Request): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type?.toLowerCase() === 'bearer' ? token : null;
  }
}

export function AuthGuard(): MethodDecorator {
  return UseGuards(JwtAuthGuard);
}

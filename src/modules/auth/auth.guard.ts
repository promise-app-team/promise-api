import { CanActivate, ExecutionContext, Injectable, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { HttpException } from '@/common';
import { UserService } from '@/modules/user/user.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly userService: UserService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.getToken(request);
    if (!token) throw HttpException.new('로그인이 필요합니다.', 'UNAUTHORIZED');

    try {
      const payload = this.jwt.verify(token);
      const user = await this.userService.findOneById(+payload.id);
      if (!user) throw HttpException.new('로그인이 필요합니다..', 'UNAUTHORIZED');
      request.user = user;
    } catch (error) {
      throw HttpException.new('로그인이 필요합니다...', 'UNAUTHORIZED');
    }
    return true;
  }

  private getToken(request: Request): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}

export function AuthGuard(): MethodDecorator {
  return (target, key, descriptor) => {
    UseGuards(JwtAuthGuard)(target, key, descriptor);
  };
}

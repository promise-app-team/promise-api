import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.getToken(request);
    if (!token) throw new UnauthorizedException('로그인이 필요합니다.');

    try {
      const payload = this.jwt.verify(token, {
        secret: this.config.get('JWT_SECRET_KEY'),
      });
      request.user = await this.userService.findOneById(payload.id);
    } catch {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }
    return true;
  }

  private getToken(request: Request): string | null {
    const [type, token] = request.headers['authorization']?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}

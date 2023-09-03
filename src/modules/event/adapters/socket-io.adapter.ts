import { UserEntity } from '@/modules/auth/entities/user.entity';
import { UserService } from '@/modules/auth/services/user.service';
import {
  INestApplicationContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions, Socket } from 'socket.io';

export class SocketIoAdapter extends IoAdapter {
  private readonly logger = new Logger(SocketIoAdapter.name);
  constructor(private readonly app: INestApplicationContext) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server: Server = super.createIOServer(port, options);
    false && // TODO: 인증 절차 임시 해제
      server
        .of('ping')
        .use(async (socket: Socket & { user: UserEntity }, next) => {
          const jwt = this.app.get(JwtService);
          const user = this.app.get(UserService);
          const config = this.app.get(ConfigService);
          const token = this.getToken(socket);
          if (!token) next(new UnauthorizedException('로그인이 필요합니다.'));

          try {
            const payload = jwt.verify(token, {
              secret: config.get('JWT_SECRET_KEY'),
            });
            socket.user = await user.findOneById(payload.id);
            next();
          } catch (error) {
            this.logger.error(error);
            next(new UnauthorizedException('로그인이 필요합니다.'));
          }
        });

    return server;
  }

  private getToken(socket: Socket): string | null {
    const [type, token] =
      socket.handshake.headers['authorization']?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}

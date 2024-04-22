import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { UserService } from '../user/user.service';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthTokenService } from './jwt-token.service';

import { TypedConfigService } from '@/config/env';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [TypedConfigService],
      useFactory(config: TypedConfigService) {
        const issuer = 'api.promise-app.com';
        const audience = 'promise-app.com';

        return {
          privateKey: config.get('jwt.signKey'),
          publicKey: config.get('jwt.verifyKey'),
          signOptions: {
            algorithm: 'ES256',
            audience,
            issuer,
          },
          verifyOptions: {
            algorithms: ['ES256'],
            audience,
            issuer,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [JwtAuthTokenService, AuthService, UserService],
  exports: [JwtAuthTokenService],
})
export class AuthModule {}

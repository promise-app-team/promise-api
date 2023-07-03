import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export function jwtConfig(config: ConfigService): JwtModuleOptions {
  return {
    secret: config.get('JWT_SECRET_KEY'),
  };
}

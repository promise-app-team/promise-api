import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AppController } from '@/app/app.controller';
import { CommonModule } from '@/common';
import { TypedConfigService, extraEnv } from '@/config/env';
import { schema } from '@/config/validation';
import { LoggerModule } from '@/customs/logger';
import { TypedConfigModule } from '@/customs/typed-config';
import { AuthModule } from '@/modules/auth/auth.module';
import { EventModule } from '@/modules/event/event.module';
import { PromiseModule } from '@/modules/promise/promise.module';
import { FileUploadModule } from '@/modules/upload/upload.module';
import { UserModule } from '@/modules/user/user.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [
    CacheModule.register({ isGlobal: true }),
    TypedConfigModule.forRoot({
      isGlobal: true,
      load: [extraEnv],
      envFilePath: ['.env.local'],
      validationSchema: schema,
      expandVariables: true,
      config: TypedConfigService,
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [TypedConfigService],
      useFactory(config: TypedConfigService) {
        return {
          secret: config.get('jwt.secret'),
        };
      },
    }),
    LoggerModule.forRoot({
      global: true,
      blacklist: [
        'NestFactory',
        'InstanceLoader',
        'RoutesResolver',
        'RouterExplorer',
        'WebSocketEventGateway',
        'WebSocketsController',
      ],
    }),
    AuthModule,
    UserModule,
    EventModule,
    PromiseModule,
    FileUploadModule,
    CommonModule,
    PrismaModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

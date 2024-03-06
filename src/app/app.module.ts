import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
// import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../modules/auth/auth.module';
import { extraEnv } from '../config/env';
import { schema } from '../config/validation';
import { JwtModule } from '@nestjs/jwt';
import { EventModule } from '@/modules/event/event.module';
import { UserModule } from '@/modules/user/user.module';
import { jwtConfig } from '@/config/token';
import { PromiseModule } from '@/modules/promise/promise.module';
import { FileUploadModule } from '@/modules/upload/upload.module';
import { CacheModule } from '@nestjs/cache-manager';
import { CommonModule } from '@/common/common.module';
import { LoggerMiddleware } from '@/common/middlewares/logger.middleware';
import { TrimMiddleware } from '@/common/middlewares/trim.middleware';
import { PrismaModule } from '@/prisma';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [extraEnv],
      envFilePath: ['.env'],
      validationSchema: schema,
      expandVariables: true,
    }),
    // RedisModule.forRootAsync({
    //   inject: [ConfigService],
    //   useFactory: (config: ConfigService) => ({
    //     type: 'single',
    //     url: config.get('REDIS_URL'),
    //     options: {
    //       password: config.get('REDIS_PASSWORD'),
    //     },
    //   }),
    // }),
    CacheModule.register({ isGlobal: true }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => jwtConfig(config),
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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
    consumer.apply(TrimMiddleware).forRoutes('*');
  }
}

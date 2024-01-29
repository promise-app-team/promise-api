import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { RedisModule } from '@nestjs-modules/ioredis';
import { typeormConfig } from '@/config/orm';
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
import { CommonModule } from '@/modules/common/common.module';
import { LoggerMiddleware } from '@/modules/common/middlewares/logger.middleware';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [extraEnv],
      envFilePath: ['.env'],
      validationSchema: schema,
      expandVariables: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => typeormConfig(config),
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
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}

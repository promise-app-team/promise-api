import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeormConfig } from '@/config/orm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { extraEnv } from './config/env';
import Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [extraEnv],
      validationSchema: Joi.object({
        TZ: Joi.string().default('Asia/Seoul'),
        PORT: Joi.number().default(8080),
        NODE_ENV: Joi.string().valid('local', 'development', 'production'),

        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required().allow(''),
        DB_DATABASE: Joi.string().required(),

        KAKAO_REST_API_KEY: Joi.string().optional(),
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory(config: ConfigService) {
        return typeormConfig(config);
      },
    }),
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

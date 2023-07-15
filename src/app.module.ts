import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeormConfig } from '@/config/orm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { extraEnv } from './config/env';
import { schema } from './config/validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [extraEnv],
      validationSchema: schema,
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

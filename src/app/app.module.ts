import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [extraEnv],
      validationSchema: schema,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => typeormConfig(config),
    }),
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
  ],
  controllers: [AppController],
})
export class AppModule {}

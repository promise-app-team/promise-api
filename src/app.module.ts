import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeormConfig } from '@/config/orm';
import { ConfigModule } from '@nestjs/config';
import { envConfig } from '@/config/env';
import { AuthProvider } from './modules/auth/auth.provider';

@Module({
  imports: [
    ConfigModule.forRoot({ load: [envConfig] }),
    TypeOrmModule.forRoot(typeormConfig),
    AuthProvider,
  ],
  controllers: [AppController],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import typeormConfig from '@/config/orm';
import { ConfigModule } from '@nestjs/config';
import env from '@/config/env';
import { PromiseModule } from '@/modules/promise/promise.module';

@Module({
  imports: [
    ConfigModule.forRoot({ load: [env] }),
    TypeOrmModule.forRoot(typeormConfig),
    PromiseModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

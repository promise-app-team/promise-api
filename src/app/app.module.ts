import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AppController } from '@/app/app.controller';
import { TypedConfigService, CommonModule } from '@/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { EventModule } from '@/modules/event/event.module';
import { PromiseModule } from '@/modules/promise/promise.module';
import { FileUploadModule } from '@/modules/upload/upload.module';
import { UserModule } from '@/modules/user/user.module';
import { PrismaModule } from '@/prisma';

@Module({
  imports: [
    CacheModule.register({ isGlobal: true }),
    JwtModule.registerAsync({
      global: true,
      inject: [TypedConfigService],
      useFactory(config: TypedConfigService) {
        return {
          secret: config.get('jwt.secret'),
        };
      },
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

import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { LoggerMiddleware } from '@/common/middlewares/logger.middleware';
import { TrimMiddleware } from '@/common/middlewares/trim.middleware';
import { TypedConfigModule } from '@/common/modules/typed-config.module';
import { HasherService } from '@/common/services/hasher.service';

@Global()
@Module({
  imports: [
    TypedConfigModule.forRoot({
      global: true,
    }),
  ],
  providers: [HasherService],
  exports: [HasherService],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TrimMiddleware).forRoutes('*');
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}

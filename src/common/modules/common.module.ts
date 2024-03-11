import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { LoggerMiddleware } from '@/common/middlewares/logger.middleware';
import { TrimMiddleware } from '@/common/middlewares/trim.middleware';

@Global()
@Module({})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TrimMiddleware).forRoutes('*');
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}

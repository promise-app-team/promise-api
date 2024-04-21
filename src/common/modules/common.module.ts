import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { LoggerMiddleware, TrimMiddleware } from '../middlewares';

@Global()
@Module({})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TrimMiddleware).forRoutes('*');
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}

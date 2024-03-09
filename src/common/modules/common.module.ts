import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { LoggerMiddleware } from '@/common/middlewares/logger.middleware';
import { TrimMiddleware } from '@/common/middlewares/trim.middleware';
import { LoggerModule } from '@/common/modules/logger.module';
import { TypedConfigModule } from '@/common/modules/typed-config.module';
import { HasherService } from '@/common/services/hasher.service';

@Global()
@Module({
  imports: [
    TypedConfigModule.forRoot({
      global: true,
    }),
    LoggerModule.forRoot({
      global: true,
      blacklist: [
        'NestFactory',
        'InstanceLoader',
        'RoutesResolver',
        'RouterExplorer',
        'WebSocketEventGateway',
        'WebSocketsController',
      ],
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

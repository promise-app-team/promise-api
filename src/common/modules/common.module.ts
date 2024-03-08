import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { extraEnv } from '@/common/config/env';
import { schema } from '@/common/config/validation';
import { LoggerMiddleware } from '@/common/middlewares/logger.middleware';
import { TrimMiddleware } from '@/common/middlewares/trim.middleware';
import { LoggerModule } from '@/common/modules/logger.module';
import { HasherService } from '@/common/services/hasher.service';
import { TypedConfigService } from '@/common/services/typed-config.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [extraEnv],
      envFilePath: ['.env'],
      validationSchema: schema,
      expandVariables: true,
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
  providers: [HasherService, TypedConfigService],
  exports: [HasherService, TypedConfigService],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TrimMiddleware).forRoutes('*');
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}

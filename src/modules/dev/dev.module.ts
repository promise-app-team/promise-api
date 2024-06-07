import { join } from 'node:path';

import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';

import { DevController } from './dev.controller';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'views'),
      renderPath: '/dev',
      serveRoot: '/dev',
    }),
  ],
  controllers: [DevController],
})
export class DevModule {}

import { join } from 'node:path';

import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';

import { DevelopController } from './develop.controller';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'views'),
      renderPath: '/develop',
      serveRoot: '/develop',
    }),
  ],
  controllers: [DevelopController],
})
export class DevelopModule {}

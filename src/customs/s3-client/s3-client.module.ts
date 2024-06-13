import { DynamicModule, Module } from '@nestjs/common';

import { S3ClientModuleAsyncOptions, S3ClientModuleOptions } from './s3-client.interface';
import { S3ClientService } from './s3-client.service';

@Module({})
export class S3ClientModule {
  static forRoot({ global, scope, s3options }: S3ClientModuleOptions): DynamicModule {
    return {
      global,
      module: S3ClientModule,
      providers: [
        {
          scope,
          provide: S3ClientService,
          useFactory: () => new S3ClientService(s3options),
        },
      ],
      exports: [S3ClientService],
    };
  }

  static forRootAsync({ global, scope, inject, useFactory }: S3ClientModuleAsyncOptions): DynamicModule {
    return {
      global,
      module: S3ClientModule,
      providers: [
        {
          scope,
          inject,
          provide: S3ClientService,
          async useFactory(...args) {
            const opts = await useFactory(...args);
            return new S3ClientService(opts.s3options);
          },
        },
      ],
      exports: [S3ClientService],
    };
  }
}

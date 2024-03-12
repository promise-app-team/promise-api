import { DynamicModule, Module } from '@nestjs/common';

import { S3ClientModuleAsyncOptions, S3ClientModuleOptions } from './s3-client.interface';
import { S3ClientService } from './s3-client.service';

@Module({})
export class S3ClientModule {
  static forRoot(options: S3ClientModuleOptions): DynamicModule {
    return {
      module: S3ClientModule,
      providers: [
        {
          provide: S3ClientService,
          useFactory: () => new S3ClientService(options.s3options),
        },
      ],
      exports: [S3ClientService],
    };
  }

  static forRootAsync(options: S3ClientModuleAsyncOptions): DynamicModule {
    return {
      module: S3ClientModule,
      providers: [
        {
          provide: S3ClientService,
          async useFactory(...args) {
            const opts = await options.useFactory(...args);
            return new S3ClientService(opts.s3options);
          },
          inject: options.inject,
        },
      ],
      exports: [S3ClientService],
    };
  }
}

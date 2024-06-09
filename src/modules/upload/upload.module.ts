import { Module } from '@nestjs/common';

import { TypedConfigService } from '@/config/env';
import { S3ClientModule } from '@/customs/s3-client';

import { UserModule } from '../user';

import { FileUploadController } from './upload.controller';
import { FileUploadService } from './upload.service';

@Module({
  imports: [
    UserModule,
    S3ClientModule.forRootAsync({
      inject: [TypedConfigService],
      useFactory(config: TypedConfigService) {
        return {
          s3options: {
            region: config.get('aws.region'),
          },
        };
      },
    }),
  ],
  controllers: [FileUploadController],
  providers: [FileUploadService],
})
export class FileUploadModule {}

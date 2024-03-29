import { Module } from '@nestjs/common';

import { UserModule } from '../user/user.module';

import { FileUploadController } from './upload.controller';
import { FileUploadService } from './upload.service';

import { TypedConfigService } from '@/config/env';
import { S3ClientModule } from '@/customs/s3-client/s3-client.module';

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

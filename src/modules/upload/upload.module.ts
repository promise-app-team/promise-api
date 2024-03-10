import { Module } from '@nestjs/common';

import { TypedConfig } from '@/config/env';
import { S3ClientModule } from '@/customs/s3-client';
import { FileUploadController } from '@/modules/upload/upload.controller';
import { FileUploadService } from '@/modules/upload/upload.service';
import { UserModule } from '@/modules/user/user.module';

@Module({
  imports: [
    UserModule,
    S3ClientModule.forRootAsync({
      inject: [TypedConfig],
      useFactory(config: TypedConfig) {
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

import { Module } from '@nestjs/common';

import { FileUploadController } from '@/modules/upload/upload.controller';
import { FileUploadService } from '@/modules/upload/upload.service';
import { UserModule } from '@/modules/user/user.module';

@Module({
  imports: [UserModule],
  controllers: [FileUploadController],
  providers: [FileUploadService],
})
export class FileUploadModule {}

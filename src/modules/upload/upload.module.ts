import { Module } from '@nestjs/common';
import { FileUploadService } from './upload.service';
import { FileUploadController } from './upload.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [FileUploadController],
  providers: [FileUploadService],
})
export class FileUploadModule {}

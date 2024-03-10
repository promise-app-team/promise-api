import { FileUploadService } from '@/modules/upload/upload.service';
import { sleep } from '@/tests/utils/async';
import { MethodTypes } from '@/types';

export enum MockFilename {
  Valid = 'file.txt',
  Invalid = 'file',
}

export class MockFileUploadService implements MethodTypes<FileUploadService> {
  async upload(file: Express.Multer.File): Promise<string> {
    await sleep(200);
    switch (file.originalname) {
      case MockFilename.Valid:
        return 'https://s3.ap-northeast-2.amazonaws.com/bucket/2021-01-01/uuid.txt';
      case MockFilename.Invalid:
      default:
        throw new Error();
    }
  }
}

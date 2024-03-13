import { Test } from '@nestjs/testing';

import { TypedConfigService } from '@/config/env';
import { S3ClientService } from '@/customs/s3-client/s3-client.service';
import { FileUploadService } from '@/modules/upload/upload.service';

describe(FileUploadService, () => {
  let uploadService: FileUploadService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FileUploadService,
        { provide: S3ClientService, useValue: { send() {} } },
        { provide: TypedConfigService, useValue: { get() {} } },
      ],
    }).compile();

    uploadService = module.get(FileUploadService);
  });

  test('should be defined', () => {
    expect(uploadService).toBeDefined();
  });

  describe(FileUploadService.prototype.upload, () => {
    test('should upload a file', async () => {
      const file1 = { originalname: 'file' } as Express.Multer.File;
      const file2 = { originalname: 'file.txt' } as Express.Multer.File;
      await expect(uploadService.upload(file1)).resolves.toMatch(/^https:\/\/s3\..+\.amazonaws\.com\/.+/);
      await expect(uploadService.upload(file2)).resolves.toMatch(/^https:\/\/s3\..+\.amazonaws\.com\/.+/);
    });
  });
});

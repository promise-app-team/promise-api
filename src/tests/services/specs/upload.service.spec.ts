import { Test } from '@nestjs/testing';

import { TypedConfig } from '@/config/env';
import { S3ClientService } from '@/customs/s3-client';
import { FileUploadService } from '@/modules/upload/upload.service';
import { MockTypedConfigService } from '@/tests/services/mocks/typed-config.service.mock';

describe(FileUploadService, () => {
  let uploadService: FileUploadService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FileUploadService,
        { provide: S3ClientService, useValue: { send: () => {} } },
        { provide: TypedConfig, useClass: MockTypedConfigService },
      ],
    }).compile();

    uploadService = module.get(FileUploadService);
  });

  test('should be defined', () => {
    expect(uploadService).toBeDefined();
  });

  describe(FileUploadService.prototype.upload, () => {
    test('should upload a file', async () => {
      const file = {
        originalname: 'file.txt',
        buffer: Buffer.from('file'),
        mimetype: 'text/plain',
      } as Express.Multer.File;
      return expect(uploadService.upload(file)).resolves.toMatch(/^https:\/\/s3\..+\.amazonaws\.com\/.+/);
    });
  });
});

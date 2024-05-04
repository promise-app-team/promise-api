import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { JwtAuthTokenService } from '@/modules/auth';
import { FileUploadController, FileUploadService } from '@/modules/upload';
import { UserService } from '@/modules/user';

describe(FileUploadController, () => {
  let uploadController: FileUploadController;

  const mockFileUploadService = {
    async upload(file: Express.Multer.File): Promise<string> {
      switch (file.originalname) {
        case 'valid.png':
          return 'https://s3.ap-northeast-2.amazonaws.com/bucket/2021-01-01/uuid.txt';
        case 'invalid.png':
        default:
          throw new Error();
      }
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [FileUploadController],
      providers: [
        { provide: UserService, useValue: {} },
        { provide: JwtAuthTokenService, useValue: {} },
        { provide: FileUploadService, useValue: mockFileUploadService },
      ],
    }).compile();

    uploadController = module.get(FileUploadController);
  });

  test('should be defined', () => {
    expect(uploadController).toBeDefined();
  });

  describe(FileUploadController.prototype.uploadImageFile, () => {
    test('should throw an error when called with an invalid file', async () => {
      const file = {
        originalname: 'invalid.png',
        buffer: Buffer.from('file'),
        mimetype: 'text/plain',
      } as Express.Multer.File;
      return expect(uploadController.uploadImageFile(file)).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });
});

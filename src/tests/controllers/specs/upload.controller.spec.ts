import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { FileUploadController } from '@/modules/upload/upload.controller';
import { FileUploadService } from '@/modules/upload/upload.service';
import { UserService } from '@/modules/user/user.service';
import { MockJwtService } from '@/tests/services/mocks/jwt.service.mock';
import { MockFileUploadService, MockFilename } from '@/tests/services/mocks/upload.service.mock';
import { MockUserService } from '@/tests/services/mocks/user.service.mock';

describe(FileUploadController, () => {
  let uploadController: FileUploadController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [FileUploadController],
      providers: [
        { provide: JwtService, useValue: MockJwtService },
        { provide: UserService, useValue: MockUserService },
        { provide: FileUploadService, useValue: MockFileUploadService },
      ],
    }).compile();

    uploadController = module.get(FileUploadController);
  });

  test('should be defined', () => {
    expect(uploadController).toBeDefined();
  });

  describe(FileUploadController.prototype.uploadImageFile, () => {
    test('should upload a file', async () => {
      const file = {
        originalname: MockFilename.Valid,
        buffer: Buffer.from('file'),
        mimetype: 'text/plain',
      } as Express.Multer.File;
      return expect(uploadController.uploadImageFile(file)).resolves.toEqual({
        url: expect.stringMatching(/^https:\/\/s3\..+\.amazonaws\.com\/.+/),
      });
    });

    test('should throw an error when called with an invalid file', async () => {
      const file = {
        originalname: MockFilename.Invalid,
        buffer: Buffer.from('file'),
        mimetype: 'text/plain',
      } as Express.Multer.File;
      return expect(uploadController.uploadImageFile(file)).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });
});

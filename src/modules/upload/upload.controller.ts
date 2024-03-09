import { Controller, ParseFilePipeBuilder, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';

import { HttpException } from '@/common';
import { Post } from '@/customs/nest';
import { OutputUploadFileDTO } from '@/modules/upload/upload.dto';
import { FileUploadService } from '@/modules/upload/upload.service';

@ApiTags('FileUpload')
@ApiBearerAuth()
@Controller('upload')
export class FileUploadController {
  constructor(private readonly uploader: FileUploadService) {}

  @Post('image', { auth: true, description: '이미지 파일을 업로드합니다.' })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  async uploadImageFile(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: 'image' })
        .addMaxSizeValidator({
          maxSize: 1024 * 1024 * 5,
          message: '이미지 파일은 최대 5MB까지 업로드 가능합니다.',
        })
        .build()
    )
    file: Express.Multer.File
  ): Promise<OutputUploadFileDTO> {
    return {
      url: await this.uploader
        .upload(file)
        .catch((error) => HttpException.throw('파일 업로드에 실패했습니다.', 'INTERNAL_SERVER_ERROR', error)),
    };
  }
}

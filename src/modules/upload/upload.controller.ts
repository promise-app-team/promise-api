import { Post, Controller, UploadedFile, UseGuards, UseInterceptors, ParseFilePipeBuilder } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { HttpException } from '@/common';
import { JwtAuthGuard } from '@/modules/auth/jwt.guard';
import { OutputUploadFileDTO } from '@/modules/upload/upload.dto';
import { FileUploadService } from '@/modules/upload/upload.service';

@ApiTags('File Upload')
@ApiBearerAuth()
@Controller('upload')
export class FileUploadController {
  constructor(private readonly uploader: FileUploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ operationId: 'uploadImageFile', summary: '이미지 파일 업로드' })
  @ApiCreatedResponse({ type: OutputUploadFileDTO, description: '이미지 파일 업로드 성공' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
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

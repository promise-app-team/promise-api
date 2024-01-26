import { JwtAuthGuard } from '@/modules/auth/jwt.guard';
import {
  Post,
  Controller,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileUploadService } from './upload.service';
import { FileUploadOutput } from './upload.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { HttpException } from '@/schema/exception';

@ApiTags('File Upload')
@ApiBearerAuth()
@Controller('upload')
export class FileUploadController {
  constructor(private readonly uploader: FileUploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({
    operationId: 'uploadImageFile',
    summary: '이미지 파일 업로드',
  })
  @ApiCreatedResponse({
    type: FileUploadOutput,
    description: '이미지 파일 업로드 성공',
  })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  async uploadImageFile(@UploadedFile() file: Express.Multer.File) {
    try {
      return { url: await this.uploader.upload(file) };
    } catch (error) {
      throw new BadRequestException('파일 업로드에 실패했습니다.');
    }
  }
}

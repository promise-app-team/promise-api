import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { format } from 'date-fns';
import { v4 as uuid } from 'uuid';

@Injectable()
export class FileUploadService {
  private readonly client: S3Client;
  constructor(private readonly config: ConfigService) {
    this.client = new S3Client({
      region: this.config.get('AWS_DEFAULT_REGION'),
    });
  }

  async upload(file: Express.Multer.File): Promise<string> {
    const ext = file.originalname.split('.').pop();
    const env = this.config.get('STAGE');
    const directory = `${env}/${format(Date.now(), 'yyyy-MM-dd')}`;
    const path = `${directory}/${uuid()}${ext ? `.${ext}` : ''}`;
    const bucket = this.config.get('AWS_S3_BUCKET_NAME');
    const region = this.config.get('AWS_DEFAULT_REGION');

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: path,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );
      return `https://s3.${region}.amazonaws.com/${bucket}/${path}`;
    } catch (error) {
      console.error(error);
      throw new Error('파일 업로드에 실패했습니다.');
    }
  }
}

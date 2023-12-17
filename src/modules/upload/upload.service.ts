import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { format } from 'date-fns';
import { v4 as uuid } from 'uuid';

@Injectable()
export class FileUploadService {
  private readonly client: S3Client;
  constructor(private readonly config: ConfigService) {
    this.client = new S3Client({
      region: config.get('AWS_REGION'),
      credentials: {
        accessKeyId: config.get('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY')!,
      },
    });
  }

  async upload(file: Express.Multer.File): Promise<string> {
    const ext = file.originalname.split('.').pop();
    const env = this.config.get('NODE_ENV') === 'production' ? 'prod' : 'dev';
    const directory = `${env}/${format(Date.now(), 'yyyy-MM-dd')}`;
    const path = `${directory}/${uuid()}${ext ? `.${ext}` : ''}`;
    const bucket = this.config.get('AWS_S3_BUCKET_NAME');
    const region = this.config.get('AWS_REGION');

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

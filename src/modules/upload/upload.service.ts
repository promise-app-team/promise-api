import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { format } from 'date-fns';
import { v4 as uuid } from 'uuid';

import { TypedConfigService } from '@/common';

@Injectable()
export class FileUploadService {
  private readonly client: S3Client;
  constructor(private readonly config: TypedConfigService) {
    this.client = new S3Client({
      region: this.config.get('aws.region'),
    });
  }

  async upload(file: Express.Multer.File): Promise<string> {
    const ext = file.originalname.split('.').pop();
    const env = this.config.get('aws.stage');
    const directory = `${env}/${format(Date.now(), 'yyyy-MM-dd')}`;
    const path = `${directory}/${uuid()}${ext ? `.${ext}` : ''}`;
    const bucket = this.config.get('aws.bucket');
    const region = this.config.get('aws.region');

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

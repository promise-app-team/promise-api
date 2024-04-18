import { PutObjectCommand } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { format } from 'date-fns';
import { v4 as uuid } from 'uuid';

import { TypedConfigService } from '@/config/env';
import { S3ClientService } from '@/customs/s3-client';

@Injectable()
export class FileUploadService {
  constructor(
    private readonly client: S3ClientService,
    private readonly config: TypedConfigService
  ) {}

  async upload(file: Express.Multer.File): Promise<string> {
    const ext = file.originalname.split('.')[1];
    const stage = this.config.get('stage');
    const directory = `${stage}/${format(Date.now(), 'yyyy-MM-dd')}`;
    const path = `${directory}/${uuid()}${ext ? `.${ext}` : ''}`;
    const bucket = this.config.get('aws.bucket');
    const region = this.config.get('aws.region');

    if (this.config.get('env') !== 'test') {
      await this.client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: path,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );
    }

    return `https://s3.${region}.amazonaws.com/${bucket}/${path}`;
  }
}

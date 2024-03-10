import { PutObjectCommand } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { format } from 'date-fns';
import { v4 as uuid } from 'uuid';

import { TypedConfig } from '@/config/env';
import { S3ClientService } from '@/customs/s3-client';

@Injectable()
export class FileUploadService {
  constructor(
    private readonly client: S3ClientService,
    private readonly config: TypedConfig
  ) {}

  async upload(file: Express.Multer.File): Promise<string> {
    const ext = file.originalname.split('.').pop();
    const env = this.config.get('aws.stage');
    const directory = `${env}/${format(Date.now(), 'yyyy-MM-dd')}`;
    const path = `${directory}/${uuid()}${ext ? `.${ext}` : ''}`;
    const bucket = this.config.get('aws.bucket');
    const region = this.config.get('aws.region');

    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: path,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    return `https://s3.${region}.amazonaws.com/${bucket}/${path}`;
  }
}

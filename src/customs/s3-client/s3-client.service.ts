import { S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';

import { S3ClientConfig } from './s3-client.interface';

@Injectable()
export class S3ClientService extends S3Client {
  constructor(private readonly options: S3ClientConfig) {
    super(options ?? {});
  }
}

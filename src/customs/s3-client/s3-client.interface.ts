import { S3Client } from '@aws-sdk/client-s3';

export type S3ClientModuleOptions = {
  isGlobal?: boolean;
  s3options?: ConstructorParameters<typeof S3Client>[0];
};

export type S3ClientModuleAsyncOptions = {
  isGlobal?: boolean;
  inject?: any[];
  useFactory: (...args: any[]) => S3ClientModuleOptions | Promise<S3ClientModuleOptions>;
};

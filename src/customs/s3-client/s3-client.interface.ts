import type { BaseFactoryProvider, BaseModuleOptions } from '@/types/nest';
import type { S3Client } from '@aws-sdk/client-s3';

export interface _S3ClientModuleOptions {
  s3options?: ConstructorParameters<typeof S3Client>[0];
}

export interface _S3ClientModuleAsyncOptions extends BaseFactoryProvider<_S3ClientModuleOptions> {}

export type S3ClientModuleOptions = _S3ClientModuleOptions & BaseModuleOptions;
export type S3ClientModuleAsyncOptions = _S3ClientModuleAsyncOptions & BaseModuleOptions;

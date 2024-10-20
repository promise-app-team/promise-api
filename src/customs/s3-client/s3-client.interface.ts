import type { BaseFactoryProvider, BaseModuleOptions } from '@/types/nest'
import type { S3Client } from '@aws-sdk/client-s3'
import type { Simplify } from 'type-fest'

export type S3ClientConfig = ConstructorParameters<typeof S3Client>[0]

interface InternalS3ClientModuleOptions {
  s3options?: S3ClientConfig
}

interface InternalS3ClientModuleAsyncOptions extends BaseFactoryProvider<InternalS3ClientModuleOptions> {}

export type S3ClientModuleOptions = Simplify<InternalS3ClientModuleOptions & BaseModuleOptions>
export type S3ClientModuleAsyncOptions = Simplify<InternalS3ClientModuleAsyncOptions & BaseModuleOptions>

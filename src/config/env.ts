import { formatISO } from 'date-fns';

import { TypedConfigServiceBuilder } from '@/customs/typed-config/typed-config.service';

const BUILD = formatISO(new Date());

export const extraEnv = () => {
  const [bits, prime, inverse, xor] = (process.env.INTHASH_KEY ?? '').split('.');

  return {
    tz: process.env.TZ || 'UTC',
    stage: (process.env.STAGE || 'local') as 'local' | 'dev' | 'test' | 'prod',
    env: (process.env.NODE_ENV || 'local') as 'local' | 'development' | 'test' | 'production',
    port: +(process.env.PORT || 8080),
    build: BUILD,
    deploy: formatISO(process.env.NOW || new Date()),
    version: '0.0.0', // TODO: versioning
    colorize: !process.env.NO_COLOR,
    db: {
      host: process.env.DB_HOST,
      port: +(process.env.DB_PORT || 3306),
      name: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
    jwt: {
      secret: process.env.JWT_SECRET_KEY,
      expires: {
        access: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        refresh: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      },
    },
    aws: {
      region: process.env.AWS_DEFAULT_REGION || 'ap-southeast-2',
      bucket: process.env.AWS_S3_BUCKET_NAME,
    },
    inthash: {
      bits: +bits,
      prime,
      inverse,
      xor,
    },
  };
};

export class TypedConfigService extends TypedConfigServiceBuilder<ReturnType<typeof extraEnv>> {}

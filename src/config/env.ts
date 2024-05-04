import { formatISO } from 'date-fns';

import { TypedConfigServiceBuilder } from '@/customs/typed-config';

const BUILD = formatISO(new Date());

export const env = () => {
  const [bits, prime, inverse, xor] = (process.env.INTHASH_KEY ?? '').split('.');

  const env = {
    tz: process.env.TZ || 'UTC',
    stage: (process.env.STAGE || 'local') as 'local' | 'dev' | 'test' | 'prod',
    env: (process.env.NODE_ENV || 'local') as 'local' | 'development' | 'test' | 'production',
    port: +(process.env.PORT || 8080),
    build: BUILD,
    deploy: formatISO(process.env.NOW || new Date()),
    version: '0.0.0', // TODO: versioning
    colorize: !process.env.NO_COLOR,

    debug: {
      lambda: !!process.env.DEBUG_LAMBDA,
      prisma: !!process.env.DEBUG_PRISMA,
    },

    db: {
      host: process.env.DB_HOST,
      port: +(process.env.DB_PORT || 3306),
      name: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },

    redis: {
      host: process.env.REDIS_HOST,
      port: +(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD,
    },

    jwt: {
      signKey: process.env.JWT_SIGN_KEY!.replace(/\\n/g, '\n'),
      verifyKey: process.env.JWT_VERIFY_KEY!.replace(/\\n/g, '\n'),
      expires: {
        access: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        refresh: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      },
    },

    aws: {
      region: process.env.AWS_DEFAULT_REGION || 'ap-southeast-2',
      bucket: process.env.AWS_S3_BUCKET_NAME,
      websocket: {
        endpoint: process.env.AWS_GW_WEBSOCKET_ENDPOINT,
      },
    },

    inthash: {
      bits: +bits,
      prime,
      inverse,
      xor,
    },

    sqids: {
      key: process.env.SQIDS_KEY,
    },

    is: {
      local: process.env.STAGE === 'local',
      test: process.env.STAGE === 'test',
      dev: process.env.STAGE === 'dev',
      prod: process.env.STAGE === 'prod',
    },
  };

  return env;
};

export class TypedConfigService extends TypedConfigServiceBuilder<ReturnType<typeof env>> {}

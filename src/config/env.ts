import { formatISO } from 'date-fns';

import { TypedConfigServiceBuilder } from '@/customs/typed-config/typed-config.service';

const BUILD = formatISO(new Date());

export const extraEnv = () => {
  const [bits, prime, inverse, xor] = (process.env.INTHASH_KEY ?? '').split('.');

  return {
    tz: process.env.TZ || 'UTC',
    stage: process.env.STAGE || 'local',
    env: process.env.NODE_ENV || 'local',
    port: +(process.env.PORT || 8080),
    build: BUILD,
    deploy: formatISO(process.env.NOW || new Date()),
    version: '0.0.0', // TODO: versioning
    'colorize.log': !process.env.NO_COLOR,
    jwt: {
      secret: process.env.JWT_SECRET_KEY,
      expires: {
        access: process.env.JWT_ACCESS_EXPIRES_IN,
        refresh: process.env.JWT_REFRESH_EXPIRES_IN,
      },
    },
    aws: {
      region: process.env.AWS_DEFAULT_REGION,
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

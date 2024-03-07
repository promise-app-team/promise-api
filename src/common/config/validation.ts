import Joi from 'joi';

export const schema = Joi.object({
  TZ: Joi.string().default('UTC'),
  PORT: Joi.number().default(8080),
  STAGE: Joi.string().valid('local', 'development', 'production').default('local'),
  NODE_ENV: Joi.string().valid('local', 'development', 'production').default('local'),

  JWT_SECRET_KEY: Joi.string().allow(''),
  INTHASH_KEY: Joi.string().required(),

  JWT_ACCESS_EXPIRES_IN: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().required(),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_NAME: Joi.string().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required().allow(''),

  DB_URL: Joi.string().required(),
  DB_SHADOW_URL: Joi.string().required(),

  AWS_DEFAULT_REGION: Joi.string().required(),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_S3_BUCKET_NAME: Joi.string().required(),
});

import Joi from 'joi';

export const schema = Joi.object({
  TZ: Joi.string().required(),
  STAGE: Joi.string().valid('local', 'test', 'dev', 'prod').required(),
  NODE_ENV: Joi.string().valid('local', 'test', 'development', 'production').required(),

  DB_URL: Joi.string().required(),

  JWT_SIGN_KEY: Joi.string().required(),
  JWT_VERIFY_KEY: Joi.string().required(),
  INTHASH_KEY: Joi.string().required(),

  JWT_ACCESS_EXPIRES_IN: Joi.string().allow(''),
  JWT_REFRESH_EXPIRES_IN: Joi.string().allow(''),

  AWS_DEFAULT_REGION: Joi.string().allow(''),
  AWS_ACCESS_KEY_ID: Joi.string().allow(''),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow(''),
  AWS_S3_BUCKET_NAME: Joi.string().allow(''),
});

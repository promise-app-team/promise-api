import Joi from 'joi';

export const schema = Joi.object({
  TZ: Joi.string().required(),
  STAGE: Joi.string().valid('local', 'dev', 'prod').required(),
  NODE_ENV: Joi.string().valid('local', 'development', 'production').required(),

  JWT_SECRET_KEY: Joi.string().required(),
  INTHASH_KEY: Joi.string().required(),

  JWT_ACCESS_EXPIRES_IN: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().required(),

  AWS_DEFAULT_REGION: Joi.string().required(),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_S3_BUCKET_NAME: Joi.string().required(),
});

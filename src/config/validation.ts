import Joi from 'joi';

export const schema = Joi.object({
  TZ: Joi.string().default('Asia/Seoul'),
  PORT: Joi.number().default(8080),
  NODE_ENV: Joi.string().valid('local', 'development', 'production'),

  JWT_SECRET_KEY: Joi.string().allow(''),
  JWT_ACCESS_EXPIRES_IN: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().required(),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required().allow(''),
  DB_DATABASE: Joi.string().required(),
});

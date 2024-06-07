export const envs = {
  stage: process.env.STAGE,
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: `${process.env.DB_NAME}_${process.env.STAGE}`,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    url: process.env.DB_URL,
    shadowUrl: process.env.DB_SHADOW_URL,
  },
} as const;

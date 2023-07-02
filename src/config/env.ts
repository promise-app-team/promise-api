import format from 'date-fns/format';

export const envConfig = () => ({
  API_VERSION: process.env.npm_package_version,
  BUILD: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
  NODE_ENV: process.env.NODE_ENV,
  TZ: process.env.TZ,
});

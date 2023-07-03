import format from 'date-fns/format';

export const extraEnv = () => ({
  BUILD: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
  API_VERSION: process.env.npm_package_version,
});

import format from 'date-fns/format';

export const extraEnv = () => {
  return {
    BUILD: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    API_VERSION: process.env.npm_package_version,
  };
};

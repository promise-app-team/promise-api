import format from 'date-fns/format';

export const extraEnv = () => {
  const PORT = process.env.PORT || 8080;
  return {
    BUILD: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    API_VERSION: process.env.npm_package_version,
    API_URL:
      process.env.HTTPS === 'true'
        ? 'https://api.promise.local'
        : `http://localhost:${PORT}`,
  };
};

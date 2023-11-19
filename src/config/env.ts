import { formatISO } from 'date-fns';

export const extraEnv = () => {
  return {
    BUILD: formatISO(new Date()),
    API_VERSION: process.env.npm_package_version,
  };
};

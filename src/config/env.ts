import { formatISO } from 'date-fns';

const BUILD = formatISO(new Date());

export const extraEnv = () => {
  return {
    BUILD,
    API_VERSION: process.env.npm_package_version,
  };
};

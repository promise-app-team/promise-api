import { formatISO } from 'date-fns';

export const extraEnv = () => {
  return {
    BUILD: formatISO(new Date()),
    API_VERSION: Bun.env.npm_package_version,
  };
};

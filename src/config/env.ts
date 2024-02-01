import { formatISO } from 'date-fns';

const BUILD = formatISO(new Date());

export const extraEnv = () => {
  return {
    BUILD,
    DEPLOY: formatISO(process.env.DEPLOY || new Date()),
    API_VERSION: '0.0.0', // TODO: versioning
  };
};

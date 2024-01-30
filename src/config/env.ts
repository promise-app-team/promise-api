const BUILD = new Date();

export const extraEnv = () => {
  return {
    BUILD,
    API_VERSION: '0.0.0', // TODO: versioning
  };
};

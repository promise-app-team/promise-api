const BUILD = new Date();

export const extraEnv = () => {
  return {
    BUILD,
    API_VERSION: process.env.npm_package_version,
  };
};

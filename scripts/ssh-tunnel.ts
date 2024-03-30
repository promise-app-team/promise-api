import { execute, logger } from './utils';

const env = {
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
  },
  ssh: {
    key: process.env.SSH_KEY,
    user: process.env.SSH_USER,
    host: process.env.SSH_HOST,
  },
};

const tunnel = `${env.db.port}:${env.db.host}:3306 ${env.ssh.user}@${env.ssh.host}`;
logger.info(`Establishing SSH tunnel to ${tunnel}...`);

execute(
  `
    ssh \
    -E /dev/null \
    -o LogLevel=error \
    -o ConnectTimeout=10 \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -i $SSH_KEY -L ${tunnel}
  `
).catch((error) => {
  const exitCode = error.code ?? 1;
  if ([0, 130].includes(exitCode)) {
    process.exit(0);
  }
  logger.error(`Failed to establish SSH tunnel. (exit code: ${exitCode})`);
  process.exit(exitCode);
});

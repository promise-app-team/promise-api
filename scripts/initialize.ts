import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { generateKeyPair } from './generate-key-pair';
import { execute, logger } from './utils';

process.chdir(path.resolve(__dirname, '..'));
const letters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

async function createIntHashKey() {
  const result = await execute('npx inthash');
  const data = JSON.parse(result);
  const { bits, prime, inverse, xor } = data;
  return `${bits}.${prime}.${inverse}.${xor}`;
}

async function createSqidsKey() {
  return letters
    .split('')
    .sort(() => Math.random() - 0.5)
    .sort(() => Math.random() - 0.5)
    .sort(() => Math.random() - 0.5)
    .join('');
}

async function createJwtKeyPair() {
  const { privateKey, publicKey } = await generateKeyPair();
  return {
    public: publicKey.replace(/\n/g, '\\n'),
    private: privateKey.replace(/\n/g, '\\n'),
  };
}

async function createStrongPassword(length = 32) {
  return Array.from(crypto.randomFillSync(new Uint8Array(length)))
    .map((x) => letters[x % letters.length])
    .join('');
}

async function createEnvFile(stage: string, nodeEnv: string) {
  const envFile = `.env.${stage}`;
  if (fs.existsSync(envFile)) return;

  const inthashKey = await createIntHashKey();
  const sqidsKey = await createSqidsKey();
  const jwtKeys = await createJwtKeyPair();

  const passwordLength = nodeEnv === 'development' ? 12 : 32;
  const dbPassword = await createStrongPassword(passwordLength);
  const redisPassword = await createStrongPassword(passwordLength);

  const envExample = fs.readFileSync('.env.example', 'utf-8');
  const envContent = envExample
    .replace(/^STAGE=.*/m, `STAGE=${stage}`)
    .replace(/^NODE_ENV=.*/m, `NODE_ENV=${nodeEnv}`)
    .replace(/^INTHASH_KEY=.*/m, `INTHASH_KEY=${inthashKey}`)
    .replace(/^SQIDS_KEY=.*/m, `SQIDS_KEY=${sqidsKey}`)
    .replace(/^JWT_SIGN_KEY=.*/m, `JWT_SIGN_KEY='${jwtKeys.private}'`)
    .replace(/^JWT_VERIFY_KEY=.*/m, `JWT_VERIFY_KEY='${jwtKeys.public}'`)
    .replace(/^DB_PASSWORD=.*/m, `DB_PASSWORD=${dbPassword}`)
    .replace(/^REDIS_PASSWORD=.*/m, `REDIS_PASSWORD=${redisPassword}`);

  fs.writeFileSync(envFile, envContent);
  logger.success(`${envFile} created`);
}

async function createEnvCmdFile() {
  if (fs.existsSync('.env-cmdrc.js')) return;

  fs.copyFileSync('.env-cmdrc.example.js', '.env-cmdrc.js');
  logger.success('.env-cmdrc.js created');
}

async function main() {
  const env = {
    local: 'development',
    test: 'development',
    dev: 'production',
    prod: 'production',
  };

  for (const stage in env) {
    const nodeEnv = env[stage];
    await createEnvFile(stage, nodeEnv);
  }

  await createEnvCmdFile();
}

main().catch((error) => {
  logger.error(error);
  process.exit(1);
});

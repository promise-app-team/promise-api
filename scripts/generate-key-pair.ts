import crypto from 'node:crypto';
import { promisify } from 'node:util';

const _generateKeyPair = promisify(crypto.generateKeyPair);

export async function generateKeyPair() {
  const { privateKey, publicKey } = await _generateKeyPair('ec', {
    namedCurve: 'P-256',
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  return {
    publicKey: publicKey.replace(/\r?\n|\r/g, '\\n'),
    privateKey: privateKey.replace(/\r?\n|\r/g, '\\n'),
  };
}

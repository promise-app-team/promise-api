import crypto from 'node:crypto';

function generateKeyPair() {
  return crypto.generateKeyPairSync('ec', {
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
}

const { publicKey, privateKey } = generateKeyPair();

console.log('Copy the key pair below and paste them in your .env file');
console.log(`JWT_SIGN_KEY='${privateKey}'`.replace(/\r?\n|\r/g, '\\n').trim());
console.log(`JWT_VERIFY_KEY='${publicKey}'`.replace(/\r?\n|\r/g, '\\n').trim());

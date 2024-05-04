import crypto from 'node:crypto';

const isJson = process.argv.includes('--json');

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

const keyPair = {
  publicKey: publicKey.replace(/\r?\n|\r/g, '\\n'),
  privateKey: privateKey.replace(/\r?\n|\r/g, '\\n'),
};

if (isJson) {
  console.log(JSON.stringify(keyPair, null, 2));
} else {
  console.log('Copy the key pair below and paste them in your .env file\n');
  console.log(`JWT_SIGN_KEY='${keyPair.privateKey}'`);
  console.log(`JWT_VERIFY_KEY='${keyPair.publicKey}'`);
}

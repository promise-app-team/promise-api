if (!process.env.INTHASH_KEY) {
  throw new Error('environment variable INTHASH_KEY is not set');
}

const [_, __, method, num] = process.argv;

if (!['encode', 'decode'].includes(method) || typeof num !== 'string') {
  console.log('Usage: inthash [encode|decode] <number>\n');
  process.exit(1);
}

const [bits, prime, inverse, xor] = process.env.INTHASH_KEY.split('.');

import('inthash')
  .then(({ Hasher }) => new Hasher({ bits: +bits, prime, inverse, xor }))
  .then((hasher) => console.log(hasher[method](num)));

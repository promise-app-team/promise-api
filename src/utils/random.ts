interface Random {
  (): boolean;
  <T>(array: T[]): T;
  (min: number, max: number): number;
  (start: Date, end: Date): Date;
}

const random = function (...args: any[]) {
  const [first, second] = args;

  if (Array.isArray(first)) {
    return randomArrayPick(first);
  }

  if (typeof first === 'number' && typeof second === 'number') {
    return randomNumber(first, second);
  }

  if (first instanceof Date && second instanceof Date) {
    return randomDate(first, second);
  }

  return randomBoolean();
} as Random;

function randomBoolean(): boolean {
  return Math.random() < 0.5;
}

function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomArrayPick<T>(array: T[]): T {
  return array[randomNumber(0, array.length - 1)];
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

export { random };

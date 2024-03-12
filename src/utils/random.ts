import { shuffle } from 'remeda';

export function random(): boolean;
export function random(min: number, max: number): number;
export function random(min?: number, max?: number): number | boolean {
  if (typeof min === 'undefined' || typeof max === 'undefined') {
    return Math.random() < 0.5;
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomArray<T>(array: T[], length?: number): T[] {
  return shuffle(array).slice(0, length ?? array.length);
}

export function randomPick<T>(array: T[]): T {
  return array[random(0, array.length - 1)];
}

export function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

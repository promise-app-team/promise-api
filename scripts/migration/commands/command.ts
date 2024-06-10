import type { Constructor } from 'type-fest';

abstract class BaseCommand {
  static alias: string;

  abstract execute(...args: string[]): Promise<void>;
}

export function Command(name: string): Constructor<BaseCommand> {
  return class {
    static alias = name;
  } as any;
}

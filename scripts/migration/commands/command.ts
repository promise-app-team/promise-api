type Type<T> = { new (...args: any[]): T };

abstract class BaseCommand {
  static alias: string;

  abstract execute(...args: string[]): Promise<void>;
}

export function Command(name: string): Type<BaseCommand> {
  return class {
    static alias = name;
  } as any;
}

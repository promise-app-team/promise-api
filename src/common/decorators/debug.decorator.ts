/**
 * @deprecated Use only for debugging purposes. Do not use in production.
 */
export function Debug(): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      const name = `${target.constructor.name}.${String(propertyKey)}`;
      console.group(`${name} called with arguments:`);
      for (const i in args) {
        console.log(`argument[${+i + 1}/${args.length}]:`, JSON.stringify(args[i], null, 2));
      }

      const result = originalMethod.apply(this, args);
      console.log(`${name} returned:`);
      console.log(JSON.stringify(result, null, 2));
      console.groupEnd();

      return result;
    };
  };
}

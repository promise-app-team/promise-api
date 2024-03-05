import { registerDecorator, ValidationOptions } from 'class-validator';
import { fromUnixTime, isAfter, isValid } from 'date-fns';

export function IsAfter(
  date: Date,
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return function (object, propertyName) {
    registerDecorator({
      name: 'isAfterNow',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: string | Date | number) {
          if (typeof value === 'string') {
            value = new Date(value);
          }
          if (typeof value === 'number') {
            if (`${value}`.length === 13) {
              value = new Date(value);
            } else {
              value = fromUnixTime(value);
            }
          }
          if (isValid(value)) {
            return isAfter(value, date);
          }
          return false;
        },
        defaultMessage(args) {
          return `${args?.property} must be a date after now`;
        },
      },
    });
  };
}

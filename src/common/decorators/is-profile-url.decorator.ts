import { registerDecorator, ValidationOptions, isURL, isNumberString } from 'class-validator';

export function IsProfileUrl(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object, propertyName) {
    registerDecorator({
      name: 'isProfileUrl',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: string) {
          return isURL(value) || isNumberString(value);
        },
        defaultMessage(args) {
          return `${args?.property} must be a URL or number string`;
        },
      },
    });
  };
}

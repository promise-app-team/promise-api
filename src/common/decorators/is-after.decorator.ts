import { registerDecorator } from 'class-validator'
import { formatISO, isAfter, isValid, toDate } from 'date-fns'

import type { ValidationOptions } from 'class-validator'

export function IsAfter(date: () => Date, validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object, propertyName) {
    registerDecorator({
      name: 'isAfterNow',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: any) {
          value = toDate(value)
          return isValid(value) && isAfter(value, date())
        },
        defaultMessage(args) {
          return `${args?.property} must be a date after ${formatISO(date())}`
        },
      },
    })
  }
}

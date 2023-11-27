import { fromUnixTime, getUnixTime } from 'date-fns';
import {
  Column,
  DeleteDateColumn as _DeleteDateColumn,
  ColumnOptions,
  ValueTransformer,
} from 'typeorm';
import { snakeCase } from 'typeorm/util/StringUtils';

export const transformer: ValueTransformer = {
  to(value: any) {
    console.log('to', value, typeof value);
    if (typeof value === 'undefined') {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    return fromUnixTime(value) || null;
  },
  from(value: any) {
    console.log('from', value, typeof value);
    if (typeof value === 'undefined') {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    return getUnixTime(value) || null;
  },
};

export function CreateDateColumn(options?: ColumnOptions): PropertyDecorator {
  return (object, propertyName) => {
    Column({
      type: 'timestamp',
      name: snakeCase(String(propertyName)),
      transformer,
      ...options,
    })(object, propertyName);
  };
}

export function UpdateDateColumn(options?: ColumnOptions): PropertyDecorator {
  return (object, propertyName) => {
    Column({
      type: 'timestamp',
      name: snakeCase(String(propertyName)),
      transformer,
      ...options,
    })(object, propertyName);
  };
}

export function DeleteDateColumn(options?: ColumnOptions): PropertyDecorator {
  return (object, propertyName) => {
    _DeleteDateColumn({
      type: 'timestamp',
      name: 'deleted_at',
      transformer,
      ...options,
    })(object, propertyName);
  };
}

export function DateColumn(options?: ColumnOptions): PropertyDecorator {
  return (object, propertyName) => {
    Column({
      type: 'timestamp',
      transformer,
      ...options,
    })(object, propertyName);
  };
}

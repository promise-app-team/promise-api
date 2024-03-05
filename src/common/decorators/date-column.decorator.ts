import { Column, ColumnOptions } from 'typeorm';

export function DateColumn(options?: ColumnOptions): PropertyDecorator {
  return (target, propertyName) => {
    Column({
      type: 'timestamp',
      transformer: {
        to(value: any): any {
          if (typeof value === 'undefined') {
            return undefined;
          }

          if (value === null) {
            return null;
          }

          const date = new Date(value);
          if (isNaN(date.getTime())) {
            return null;
          }

          return date.toISOString();
        },
        from(value: any): Date | null {
          return value ? new Date(value) : null;
        },
      },
      ...options,
    })(target, propertyName);
  };
}

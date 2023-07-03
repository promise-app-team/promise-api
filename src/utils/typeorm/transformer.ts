import { fromUnixTime, getUnixTime } from 'date-fns';
import { ValueTransformer } from 'typeorm';

export const timestamp: ValueTransformer = {
  to(value: any) {
    if (typeof value === 'undefined') {
      return undefined;
    }
    console.log('to', value);
    console.log('date', fromUnixTime(value));
    return value;
  },
  from(value: any) {
    if (typeof value === 'undefined') {
      return undefined;
    }
    console.log('from', value);
    console.log('date', getUnixTime(value));
    return value;
  },
};

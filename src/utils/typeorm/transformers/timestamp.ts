import { fromUnixTime, getUnixTime } from 'date-fns';
import { ValueTransformer } from 'typeorm';

export const timestamp: ValueTransformer = {
  to(value: any) {
    if (typeof value === 'undefined') {
      return undefined;
    }
    return fromUnixTime(value);
  },
  from(value: any) {
    if (typeof value === 'undefined') {
      return undefined;
    }
    return getUnixTime(value);
  },
};

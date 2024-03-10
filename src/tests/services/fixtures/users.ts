import { User } from '@prisma/client';
import { times } from 'remeda';

import { Provider } from '@/prisma';

export const users: User[] = times(10, (num) => ({
  id: num + 1,
  username: `user${num + 1}`,
  profileUrl: `${num + 1}`,
  provider: Provider.KAKAO,
  providerId: `${num + 1}`,
  deletedAt: null,
  leaveReason: null,
  lastSignedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
}));

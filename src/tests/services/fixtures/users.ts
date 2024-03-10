import { Provider } from '@/prisma';

export const user = Object.freeze({
  id: 1,
  username: 'username',
  profileUrl: 'http://profile.url',
  provider: Provider.KAKAO,
  providerId: '1',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  lastSignedAt: new Date(),
  leaveReason: null,
});

export const unknownUser = Object.freeze({
  ...user,
  id: 0,
  providerId: '0',
});

export const invalidUser = Object.freeze({
  ...user,
  id: -1,
  providerId: '-1',
});

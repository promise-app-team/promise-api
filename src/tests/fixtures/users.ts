import { Provider } from '@/prisma';

export const _fixture_validUser = Object.freeze({
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

export const _fixture_unknownUser = Object.freeze({
  ..._fixture_validUser,
  id: 0,
  providerId: '0',
});

export const _fixture_invalidUser = Object.freeze({
  ..._fixture_validUser,
  id: -1,
  providerId: '-1',
});

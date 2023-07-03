import { User } from '../entities/user.entity';

type OAuthRequestUser = Pick<
  User,
  'username' | 'profileUrl' | 'provider' | 'providerId'
>;

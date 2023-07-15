import { User } from '../entities/user.entity';

export type OAuthRequestUser = Pick<
  User,
  'username' | 'profileUrl' | 'provider' | 'providerId'
>;

export type OAuthApplePayload = {
  code: string;
  id_token: string;
  user?: string;
};

export type OAuthApplyUser = {
  email: string;
  name: {
    firstName: string;
    lastName: string;
  };
};

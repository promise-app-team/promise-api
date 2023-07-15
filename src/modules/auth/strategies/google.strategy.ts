import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { OAuthRequestUser } from '../types/oauth';
import { Provider } from '../entities/user.entity';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly config: ConfigService) {
    super({
      clientID: config.get('GOOGLE_CLIENT_ID'),
      clientSecret: config.get('GOOGLE_SECRET_KEY'),
      callbackURL: `${config.get('API_URL')}/oauth/google/redirect`,
      scope: ['profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any, info?: any) => void,
  ) {
    try {
      const {
        sub: providerId,
        name: username,
        picture: profileUrl,
      } = profile._json;

      const user: OAuthRequestUser = {
        username,
        profileUrl,
        provider: Provider.Google,
        providerId,
      };

      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-kakao';
import { OAuthRequestUser } from '../types/oauth';
import { Provider } from '../entities/user.entity';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(private readonly config: ConfigService) {
    super({
      clientID: config.get('KAKAO_REST_API_KEY'),
      callbackURL: `${config.get('API_URL')}/oauth/kakao/redirect`,
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any, info?: any) => void,
  ) {
    try {
      const {
        id: providerId,
        properties: { nickname: username, profile_image: profileUrl },
      } = profile._json;

      const user: OAuthRequestUser = {
        username,
        profileUrl,
        provider: Provider.Kakao,
        providerId,
      };

      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }
}

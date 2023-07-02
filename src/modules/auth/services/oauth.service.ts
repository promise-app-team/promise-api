import { Injectable } from '@nestjs/common';
import { OAuthRequest } from '../dtos/oauth-request.dto';

@Injectable()
export class OAuthService {
  loginWithKakao(req: OAuthRequest, res: Response) {
    //
  }
}

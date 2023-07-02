import { Body, Controller, Get, Res } from '@nestjs/common';
import { OAuthService } from '../services/oauth.service';
import { OAuthRequest } from '../dtos/oauth-request.dto';

@Controller('oauth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  @Get('kakao')
  loginWithKakao(@Body() body: OAuthRequest, @Res({ passthrough: true }) res) {
    //
  }
}

import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { OAuthService } from '../services/oauth.service';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { OAuthRequestUser } from '../types/oauth';

@Controller('oauth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  redirectToKakaoLoginPage() {
    // redirect to kakao login page
  }

  @Get('kakao/redirect')
  @UseGuards(AuthGuard('kakao'))
  async kakaoLoginCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user: OAuthRequestUser = req.user;
    const result = await this.oauthService.loginWithKakao(user);
    if (!result) {
      throw new Error('카카오톡 로그인을 실패했습니다.');
    }

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
    });

    return result;
  }
}

import {
  Controller,
  UseGuards,
  Get,
  Req,
  Res,
  Body,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuthService } from '../services/oauth.service';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { Provider } from '../entities/user.entity';
import { AppleStrategy } from '../strategies/apple.strategy';
import { OAuthApplePayload } from '../types/oauth';
import {
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('OAuth')
@Controller('oauth')
export class OAuthController {
  constructor(
    private readonly oauth: OAuthService,
    private readonly apple: AppleStrategy,
  ) {}

  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  redirectToKakaoLoginPage() {
    // redirect to kakao login page
  }

  @Get('kakao/redirect')
  @UseGuards(AuthGuard('kakao'))
  @ApiOkResponse({ description: '카카오톡 로그인 성공' })
  @ApiUnauthorizedResponse({ description: '카카오톡 로그인 실패' })
  async kakaoLoginCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.oauth.login(req.user);
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
      });
      return result;
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('카카오톡 로그인을 실패했습니다.');
    }
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  redirectToGoogleLoginPage() {
    // redirect to google login page
  }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  @ApiOkResponse({ description: '구글 로그인 성공' })
  @ApiUnauthorizedResponse({ description: '구글 로그인 실패' })
  async googleLoginCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.oauth.login(req.user);
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
      });
      return result;
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('구글 로그인을 실패했습니다.');
    }
  }

  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  redirectToAppleLoginPage() {
    // redirect to apple login page
  }

  @Post('apple/redirect')
  @ApiOkResponse({ description: '애플 로그인 성공' })
  @ApiUnauthorizedResponse({ description: '애플 로그인 실패' })
  async appleLoginCallback(@Body() payload: OAuthApplePayload) {
    try {
      const result = await this.oauth.login({
        username: this.apple.username(payload),
        profileUrl: '',
        provider: Provider.Apple,
        providerId: this.apple.id(payload),
      });
      return result;
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('애플 로그인을 실패했습니다.');
    }
  }
}

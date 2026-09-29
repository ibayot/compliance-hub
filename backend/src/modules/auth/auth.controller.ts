import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';

const TRUSTED_DEVICE_COOKIE_NAME = 'rictms_trusted_device';
const TRUSTED_DEVICE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getCookieValue(cookieHeader: string | undefined, cookieName: string): string | null {
  return cookieHeader
    ?.split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1) ?? null;
}

@ApiTags('auth')
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private accessCookieName(): string {
    return this.configService.get<string>('AUTH_ACCESS_COOKIE_NAME') as string;
  }

  private refreshCookieName(): string {
    return this.configService.get<string>('AUTH_REFRESH_COOKIE_NAME') as string;
  }

  private trustedDeviceToken(req: any, clientPlatform: string | undefined): string | undefined {
    const cookieToken = clientPlatform === 'browser'
      ? getCookieValue(req.headers?.cookie, TRUSTED_DEVICE_COOKIE_NAME)
      : null;
    const headerToken = req.headers?.['x-device-token'];
    const token = cookieToken || (Array.isArray(headerToken) ? headerToken[0] : headerToken);
    if (typeof token !== 'string') return undefined;
    const normalized = token.trim();
    return normalized.length > 0 && normalized.length <= 255 ? normalized : undefined;
  }

  private completeBrowserAuth(result: any, clientPlatform: string | undefined, res: Response) {
    if (clientPlatform !== 'browser' || !result?.accessToken || !result?.refreshToken) return result;
    const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
    res.cookie(this.accessCookieName(), result.accessToken, options);
    res.cookie(this.refreshCookieName(), result.refreshToken, { ...options, path: '/api/auth' });
    if (result.deviceToken) {
      res.cookie(TRUSTED_DEVICE_COOKIE_NAME, result.deviceToken, {
        ...options,
        maxAge: TRUSTED_DEVICE_MAX_AGE_MS,
        path: '/api/auth',
      });
    }
    const { accessToken, refreshToken, deviceToken, ...safeResult } = result;
    return safeResult;
  }

  @Get('public-config')
  getPublicConfig() {
    return this.authService.getPublicConfig();
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Request() req: any, @Res({ passthrough: true }) res: Response) {
    const clientPlatform = req.headers?.['x-client-platform'];
    const deviceToken = this.trustedDeviceToken(req, clientPlatform);
    return this.completeBrowserAuth(await this.authService.login(loginDto, deviceToken), clientPlatform, res);
  }


  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string, @Request() req: any, @Res({ passthrough: true }) res: Response) {
    const token = refreshToken || getCookieValue(req.headers?.cookie, this.refreshCookieName()) || '';
    const clientPlatform = req.headers?.['x-client-platform'];
    return this.completeBrowserAuth(await this.authService.refresh(token), clientPlatform, res);
  }

  @Post('google-login')
  async googleLogin(@Body() dto: GoogleLoginDto, @Request() req: any, @Res({ passthrough: true }) res: Response) {
    const clientPlatform = req.headers?.['x-client-platform'];
    return this.completeBrowserAuth(await this.authService.googleLogin(dto.idToken), clientPlatform, res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: User) {
    return this.authService.getProfile(user.id);
  }

  @Post('mfa/send')
  @UseGuards(JwtAuthGuard)
  async sendMfaCode(@CurrentUser() user: User) {
    return this.authService.sendMfaCode(user.id);
  }

  @Post('mfa/verify')
  async verifyMfaCode(
    @Body('tempToken') tempToken: string,
    @Body('code') code: string,
    @Body('rememberDevice') rememberDevice: boolean,
      @Request() req: any,
      @Res({ passthrough: true }) res: Response,
  ) {
    const clientPlatform = req.headers?.['x-client-platform'];
    const deviceToken = this.trustedDeviceToken(req, clientPlatform);
    return this.completeBrowserAuth(await this.authService.verifyMfaCode(tempToken, code, rememberDevice, deviceToken), clientPlatform, res);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const authHeader: string = req.headers?.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const cookieToken = getCookieValue(req.headers?.cookie, this.accessCookieName()) || '';
    const result = await this.authService.logout(bearerToken || cookieToken);
    res.clearCookie(this.accessCookieName(), { path: '/' });
    res.clearCookie(this.refreshCookieName(), { path: '/api/auth' });
    return result;
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @Post('reauthenticate')
  @UseGuards(JwtAuthGuard)
  async reauthenticate(@CurrentUser() user: User, @Body('password') password: string) {
    return this.authService.reauthenticate(user.id, password);
  }

  @Post('generate-random')
  @UseGuards(JwtAuthGuard)
  async generateRandomPassword() {
    return this.authService.generateRandomPassword();
  }

  @Post('generate-passphrase')
  @UseGuards(JwtAuthGuard)
  async generatePassphrase() {
    return this.authService.generatePassphrase();
  }
}

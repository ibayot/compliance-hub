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

@ApiTags('auth')
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private completeBrowserAuth(result: any, clientPlatform: string | undefined, res: Response) {
    if (clientPlatform !== 'browser' || !result?.accessToken || !result?.refreshToken) return result;
    const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
    res.cookie('auth_access', result.accessToken, options);
    res.cookie('auth_refresh', result.refreshToken, { ...options, path: '/api/auth' });
    const { accessToken, refreshToken, ...safeResult } = result;
    return safeResult;
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Request() req: any, @Res({ passthrough: true }) res: Response) {
    const deviceToken = req.headers?.['x-device-token'];
    const clientPlatform = req.headers?.['x-client-platform'];
    return this.completeBrowserAuth(await this.authService.login(loginDto, deviceToken), clientPlatform, res);
  }


  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string, @Request() req: any, @Res({ passthrough: true }) res: Response) {
    const token = refreshToken || req.headers?.cookie?.split(';').map((value: string) => value.trim()).find((value: string) => value.startsWith('auth_refresh='))?.slice('auth_refresh='.length);
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
    const deviceToken = req.headers?.['x-device-token'];
    const clientPlatform = req.headers?.['x-client-platform'];
    return this.completeBrowserAuth(await this.authService.verifyMfaCode(tempToken, code, rememberDevice, deviceToken), clientPlatform, res);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const authHeader: string = req.headers?.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const cookieToken = String(req.headers?.cookie || '')
      .split(';')
      .map((part: string) => part.trim())
      .find((part: string) => part.startsWith('auth_access='))
      ?.slice('auth_access='.length) || '';
    const result = await this.authService.logout(bearerToken || cookieToken);
    res.clearCookie('auth_access', { path: '/' });
    res.clearCookie('auth_refresh', { path: '/api/auth' });
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

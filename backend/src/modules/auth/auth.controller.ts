import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Headers,
  Request,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ApiHeader } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiHeader({ name: 'x-device-token', required: false, description: 'Optional device token for push notifications' })
  async login(@Body() loginDto: LoginDto, @Headers() headers: any) {
    const deviceToken = headers['x-device-token'];
    return this.authService.login(loginDto, deviceToken);
  }


  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('google-login')
  async googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto.idToken);
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
  @ApiHeader({ name: 'x-device-token', required: false, description: 'Optional device token for push notifications' })
  async verifyMfaCode(
    @Body('tempToken') tempToken: string,
    @Body('code') code: string,
    @Body('rememberDevice') rememberDevice: boolean,
    @Headers() headers: any,
  ) {
    const deviceToken = headers['x-device-token'];
    return this.authService.verifyMfaCode(tempToken, code, rememberDevice, deviceToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: any) {
    const authHeader: string = req.headers?.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    return this.authService.logout(token);
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

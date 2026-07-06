import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
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
  @UseGuards(JwtAuthGuard)
  async verifyMfaCode(@CurrentUser() user: User, @Body('code') code: string) {
    return this.authService.verifyMfaCode(user.id, code);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout() {
    // In a production app, you would invalidate the token here
    // For MVP, client will simply remove the token
    return { message: 'Logged out successfully' };
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
}

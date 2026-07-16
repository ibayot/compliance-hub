import { Injectable, UnauthorizedException, BadRequestException, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { OAuth2Client, TokenPayload as GoogleTokenPayload } from 'google-auth-library';
import { UsersService } from '../users/users.service';
import { AttendanceService } from '../tickets/services/attendance.service';
import { TicketService } from '../tickets/services/ticket.service';
import { TicketSettingsService } from '../tickets/services/ticket-settings.service';
import { EmailService } from '../tickets/services/email.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload, AuthResponse } from './interfaces/auth.interface';
import { User, UserRole } from '../users/entities/user.entity';
import { EventBusService } from '../../common/events/event-bus.service';
import { SecurityConfigService } from '../users/security-config.service';

@Injectable()
export class AuthService {
  private readonly googleClient = new OAuth2Client();

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventBus: EventBusService,
    private readonly securityConfigService: SecurityConfigService,
    @Optional() private readonly attendanceService?: AttendanceService,
    @Optional() private readonly ticketService?: TicketService,
    @Optional() private readonly ticketSettingsService?: TicketSettingsService,
    @Optional() private readonly emailService?: EmailService,
  ) {}

  private timingSafeStringEquals(a: string, b: string): boolean {
    const aBuf = Buffer.from(a, 'utf8');
    const bBuf = Buffer.from(b, 'utf8');
    const len = Math.max(aBuf.length, bBuf.length);
    const aPadded = Buffer.alloc(len);
    const bPadded = Buffer.alloc(len);
    aBuf.copy(aPadded);
    bBuf.copy(bPadded);
    const equals = crypto.timingSafeEqual(aPadded, bPadded);
    return equals && aBuf.length === bBuf.length;
  }

  private get jwtIssuer(): string {
    return this.configService.get<string>('JWT_ISSUER') || 'compliance-hub-api';
  }

  private get jwtAudience(): string {
    return this.configService.get<string>('JWT_AUDIENCE') || 'compliance-hub-client';
  }

  private buildAuthResponse(
    user: User,
    tokens: { accessToken: string; refreshToken: string },
    roleCode?: string | null,
    requiresPasswordChange?: boolean,
    requiresMfa?: boolean,
  ): AuthResponse {
    return {
      ...tokens,
      requiresPasswordChange,
      requiresMfa,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        suffix: user.suffix,
        staffId: user.staffId,
        position: user.position,
        positionFull: user.positionFull,
        designation: user.designation,
        ticketMainFocal: user.ticketMainFocal,
        ticketTechnician: user.ticketTechnician,
        role: user.role,
        roleCode: roleCode ?? null,
        units: user.units?.map((u) => ({ id: u.id, name: u.name })) || [],
      },
    };
  }

  private async verifyGoogleIdToken(idToken: string): Promise<GoogleTokenPayload> {
    const clientId = String(this.configService.get<string>('GOOGLE_CLIENT_ID') || '').trim();
    if (!clientId) {
      throw new BadRequestException('Google login is not configured on this server.');
    }

    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new UnauthorizedException('Invalid Google token payload.');
    }

    if (!payload.email || !payload.email_verified) {
      throw new UnauthorizedException('Google account must have a verified email.');
    }

    return payload;
  }

  async login(loginDto: LoginDto, deviceToken?: string): Promise<any> {
    // Check deactivated specifically before validating password
    const candidate = await this.usersService.findByEmail(loginDto.email);
    if (candidate && !candidate.active) {
      throw new UnauthorizedException(
        'This account has been deactivated. Please contact the administrator.',
      );
    }

    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Record login timestamp for staff activity tracking
    await this.usersService.recordLogin(user.id);

    // Emit event for ticketing/attendance services
    await this.eventBus.publish('user.login', { userId: user.id });

    // Check if user is using the default password
    const securityConfig = await this.securityConfigService.getConfig();
    const isUsingDefaultPassword = await bcrypt.compare(
      securityConfig.defaultPassword,
      user.passwordHash,
    );

    let requiresMfa = this.checkRequiresMfa(user);

    // Check trusted device
    if (requiresMfa && deviceToken) {
      const trustedDevice = await this.usersService.findTrustedDevice(user.id, deviceToken);
      if (trustedDevice && trustedDevice.expiresAt > new Date()) {
        requiresMfa = false;
      }
    }

    if (requiresMfa) {
      // Generate temp token
      const tempToken = this.jwtService.sign(
        { sub: user.id, isTemp: true },
        { expiresIn: '15m', issuer: this.jwtIssuer, audience: this.jwtAudience },
      );

      // Send MFA Code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);
      await this.usersService.updateMfaCode(user.id, code, expiresAt);

      // Log the MFA code to the console for debugging/local testing without SMTP
      console.log(`[MFA] Generated verification code for ${user.email}: ${code}`);

      const htmlTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #1976d2; margin: 0;">Compliance Hub</h2>
          </div>
          <div style="background-color: #f5f7fa; padding: 20px; border-radius: 8px; text-align: center;">
            <p style="margin: 0 0 10px 0; color: #555555; font-size: 16px;">Your verification code is:</p>
            <h1 style="margin: 0; color: #333333; font-size: 32px; letter-spacing: 4px;">${code}</h1>
          </div>
          <p style="color: #777777; font-size: 14px; text-align: center; margin-top: 20px;">
            This code will expire in 15 minutes. If you did not request this code, please ignore this email.
          </p>
        </div>
      `;

      if (securityConfig.mfaTestMode) {
        return { mfaRequired: true, tempToken, testModeCode: code };
      }

      await this.eventBus
        .publish('email.send', {
          to: user.email,
          subject: 'Compliance Hub - Your MFA Code',
          text: `Your verification code is: ${code}. It expires in 15 minutes.`,
          html: htmlTemplate,
        })
        .catch((e) => {
          console.error('Failed to publish email.send event for MFA', e);
        });

      return { mfaRequired: true, tempToken };
    }

    const tokens = await this.generateTokens(user);
    return this.buildAuthResponse(user, tokens, tokens.roleCode, isUsingDefaultPassword, false);
  }

  private checkRequiresMfa(user: User): boolean {
    return true;
  }

  async googleLogin(idToken: string): Promise<AuthResponse> {
    const payload = await this.verifyGoogleIdToken(idToken);

    const googleSub = String(payload.sub || '').trim();
    if (!googleSub) {
      throw new UnauthorizedException('Invalid Google subject.');
    }

    const normalizedEmail = String(payload.email || '')
      .trim()
      .toLowerCase();

    const securityConfig = await this.securityConfigService.getConfig();

    let user = await this.usersService.findByGoogleSub(googleSub);
    if (!user) {
      const existingByEmail = await this.usersService.findByEmail(normalizedEmail);
      if (existingByEmail) {
        user = await this.usersService.linkGoogleIdentity(existingByEmail.id, googleSub);
      } else {
        // Brand-new Google sign-in → register as plain 'user' (no compliance access)
        user = await this.usersService.createGoogleUser({
          email: normalizedEmail,
          firstName: String(payload.given_name || '').trim() || undefined,
          lastName: String(payload.family_name || '').trim() || undefined,
          googleSub,
          role: UserRole.USER,
          defaultPassword: securityConfig.defaultPassword,
        });
      }
    }

    if (!user.active) {
      throw new UnauthorizedException('Your account is inactive.');
    }

    // Record login timestamp for staff activity tracking
    await this.usersService.recordLogin(user.id);

    // Emit event for ticketing/attendance services
    await this.eventBus.publish('user.login', { userId: user.id });

    const isUsingDefaultPassword = await bcrypt.compare(
      securityConfig.defaultPassword,
      user.passwordHash,
    );

    const tokens = await this.generateTokens(user);
    const requiresMfa = this.checkRequiresMfa(user);
    return this.buildAuthResponse(
      user,
      tokens,
      tokens.roleCode,
      isUsingDefaultPassword,
      requiresMfa,
    );
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    console.log('validateUser called for email:', email);
    const user = await this.usersService.findByEmail(email);
    console.log('findByEmail returned:', user ? user.id : 'null');

    if (!user || !user.active) {
      console.log('user is null or not active. active:', user?.active);
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    console.log('isPasswordValid:', isPasswordValid);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async sendMfaCode(userId: number): Promise<{ message: string }> {
    const user = await this.usersService.findOne(userId);
    if (!user) throw new UnauthorizedException('User not found');

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.usersService.updateMfaCode(userId, code, expiresAt);

    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1976d2; margin: 0;">Compliance Hub</h2>
        </div>
        <div style="background-color: #f5f7fa; padding: 20px; border-radius: 8px; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #555555; font-size: 16px;">Your verification code is:</p>
          <h1 style="margin: 0; color: #333333; font-size: 32px; letter-spacing: 4px;">${code}</h1>
        </div>
        <p style="color: #777777; font-size: 14px; text-align: center; margin-top: 20px;">
          This code will expire in 15 minutes. If you did not request this code, please ignore this email.
        </p>
      </div>
    `;

    // Send email using EventBus to avoid circular dependency
    await this.eventBus.publish('email.send', {
      to: user.email,
      subject: 'Your Compliance Hub Verification Code',
      text: `Your verification code is: ${code}. It expires in 15 minutes.`,
      html: htmlTemplate,
    });

    return { message: 'Verification code sent to your email.' };
  }

  async verifyMfaCode(
    tempToken: string,
    code: string,
    rememberDevice: boolean,
    incomingDeviceToken?: string,
  ): Promise<any> {
    let payload;
    try {
      payload = this.jwtService.verify(tempToken);
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired temporary token.');
    }

    if (!payload.isTemp || !payload.sub) {
      throw new UnauthorizedException('Invalid temporary token payload.');
    }

    const userId = payload.sub;
    const user = await this.usersService.findOne(userId);
    if (!user) throw new UnauthorizedException('User not found');

    if (!user.mfaCode || !user.mfaExpiresAt) {
      throw new BadRequestException('No verification code found. Please request a new one.');
    }

    if (new Date() > user.mfaExpiresAt) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    if (user.mfaCode !== code) {
      throw new BadRequestException('Invalid verification code.');
    }

    await this.usersService.markMfaVerified(userId);

    const securityConfig = await this.securityConfigService.getConfig();
    const isUsingDefaultPassword = await bcrypt.compare(
      securityConfig.defaultPassword,
      user.passwordHash,
    );

    const tokens = await this.generateTokens(user);
    const authResponse = this.buildAuthResponse(
      user,
      tokens,
      tokens.roleCode,
      isUsingDefaultPassword,
      false,
    );

    if (rememberDevice) {
      const deviceToken = incomingDeviceToken || crypto.randomUUID();
      await this.usersService.addTrustedDevice(user.id, deviceToken);
      (authResponse as any).deviceToken = deviceToken;
    }

    return authResponse;
  }

  private async handleAutoResume(user: User) {
    if (!this.ticketSettingsService || !this.ticketService) return;

    try {
      const config = await this.ticketSettingsService.getGlobalConfig();
      if (!config || config.isFlagCeremonyPaused) return;

      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

      let shouldResume = false;
      if (config.scheduleMode === 'OFFICE_HOURS') {
        if (currentTime >= config.officeClockin && currentTime < config.officeClockout) {
          shouldResume = true;
        }
      } else if (config.scheduleMode === 'CWW') {
        if (currentTime >= config.cwwClockinStart && currentTime < config.cwwClockoutStart) {
          shouldResume = true;
        }
      }

      if (shouldResume) {
        await this.ticketService.resumeAllActiveTickets(user.id);
      }
    } catch (e) {
      // Ignore errors so login doesn't fail
    }
  }

  async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string; roleCode: string | null }> {
    // Attempt auto-resume
    this.handleAutoResume(user).catch(() => {});

    const roleCode = await this.usersService.getRoleCodeForRole(user.role).catch(() => null);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      roleCode: roleCode ?? null,
      units: user.units?.map((unit) => unit.id) || [],
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRATION'),
        issuer: this.jwtIssuer,
        audience: this.jwtAudience,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION'),
        issuer: this.jwtIssuer,
        audience: this.jwtAudience,
      }),
    ]);

    return { accessToken, refreshToken, roleCode: roleCode ?? null };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        issuer: this.jwtIssuer,
        audience: this.jwtAudience,
      });

      const user = await this.usersService.findOne(payload.sub);

      // Refuse to issue new tokens for deactivated accounts
      if (!user.active) {
        throw new UnauthorizedException('Account has been deactivated.');
      }

      const newAccessToken = await this.jwtService.signAsync(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          roleCode: await this.usersService.getRoleCodeForRole(user.role).catch(() => null),
          units: user.units?.map((unit) => unit.id) || [],
        },
        {
          secret: this.configService.get('JWT_SECRET'),
          expiresIn: this.configService.get('JWT_EXPIRATION'),
          issuer: this.jwtIssuer,
          audience: this.jwtAudience,
        },
      );

      return { accessToken: newAccessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: number): Promise<Record<string, any>> {
    const user = await this.usersService.findOne(userId);
    const roleDef = await this.usersService.findRoleDefinition(user.role);
    const securityConfig = await this.securityConfigService.getConfig();
    const requiresPasswordChange = await bcrypt.compare(
      securityConfig.defaultPassword,
      user.passwordHash,
    );
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      suffix: user.suffix,
      phoneNumber: user.phoneNumber, // <--- ADD THIS
      sex: user.sex, // <--- ADD THIS
      staffId: user.staffId,
      position: user.position,
      positionFull: user.positionFull,
      designation: user.designation,
      ticketMainFocal: user.ticketMainFocal,
      ticketTechnician: user.ticketTechnician,
      authProvider: user.authProvider,
      role: user.role,
      requiresPasswordChange,
      units: user.units?.map((u) => ({ id: u.id, name: u.name })) || [],
      roleCode: roleDef?.roleCode ?? null,
    };
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    if (this.timingSafeStringEquals(currentPassword, newPassword)) {
      throw new BadRequestException('New password must be different from current password');
    }

    const user = await this.usersService.findOne(userId);
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePasswordHash(user.id, user.passwordHash);

    return { message: 'Password updated successfully' };
  }

  async reauthenticate(userId: number, password: string): Promise<{ message: string }> {
    if (!password || password.trim().length === 0) {
      throw new BadRequestException('Password is required');
    }

    const user = await this.usersService.findOne(userId);
    if (user.authProvider === 'google') {
      throw new BadRequestException(
        'Password re-authentication is not available for Google accounts. Please sign in again.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password is incorrect');
    }

    return { message: 'Re-authentication successful' };
  }
}

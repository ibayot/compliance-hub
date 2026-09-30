import { Body, Controller, Get, Param, Post, Request, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  RATING_SESSION_COOKIE_NAME,
  RatingInvitationService,
  SendRatingInvitationsDto,
  VerifyRatingInvitationDto,
} from '../services/rating-invitation.service';
import { SubmitSatisfactionDto } from '../services/ticket.service';

function getCookieValue(cookieHeader: string | undefined, cookieName: string): string | null {
  return (
    cookieHeader
      ?.split(';')
      .map((value) => value.trim())
      .find((value) => value.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1) ?? null
  );
}

function requestMetadata(req: any) {
  const forwarded = req.headers?.['x-forwarded-for'];
  const ipAddress =
    (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    null;
  return {
    ipAddress,
    userAgent: String(req.headers?.['user-agent'] || '').slice(0, 255) || null,
  };
}

@ApiTags('rating-invitations')
@Controller('tickets/rating-invitations')
@UseGuards(JwtAuthGuard, CapabilityGuard)
@RequireCapability('isTicketSettingsFocal')
export class RatingInvitationController {
  constructor(private readonly ratingInvitations: RatingInvitationService) {}

  @Get('eligible-recipients')
  async getEligibleRecipients() {
    return this.ratingInvitations.getEligibleRecipients();
  }

  @Post('send')
  async sendInvitations(@Body() dto: SendRatingInvitationsDto, @Request() req: any) {
    return this.ratingInvitations.sendInvitations(
      dto.requesterIds,
      Number(req.user.id ?? req.user.userId),
    );
  }
}

@ApiTags('public-rating')
@Controller('tickets/rating-access')
export class PublicRatingController {
  constructor(private readonly ratingInvitations: RatingInvitationService) {}

  @Get(':token/status')
  async getStatus(@Param('token') token: string, @Request() req: any) {
    return this.ratingInvitations.getInvitationStatus(token, requestMetadata(req));
  }

  @Post(':token/request-code')
  async requestCode(@Param('token') token: string, @Request() req: any) {
    return this.ratingInvitations.requestVerificationCode(token, requestMetadata(req));
  }

  @Post(':token/verify')
  async verify(
    @Param('token') token: string,
    @Body() dto: VerifyRatingInvitationDto,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.ratingInvitations.verifyCode(token, dto.code, requestMetadata(req));
    res.cookie(RATING_SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/tickets/rating-access',
      maxAge: result.maxAgeMs,
    });
    return { verified: true };
  }

  @Get('session/tickets')
  async getSessionTickets(@Request() req: any) {
    return this.ratingInvitations.getSessionTickets(
      getCookieValue(req.headers?.cookie, RATING_SESSION_COOKIE_NAME),
      requestMetadata(req),
    );
  }

  @Post('session/tickets/:ratingItemId')
  async submitRating(
    @Param('ratingItemId') ratingItemId: string,
    @Body() dto: SubmitSatisfactionDto,
    @Request() req: any,
  ) {
    return this.ratingInvitations.submitRating(
      getCookieValue(req.headers?.cookie, RATING_SESSION_COOKIE_NAME),
      ratingItemId,
      dto,
      requestMetadata(req),
    );
  }
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum RatingInvitationStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

export enum RatingInvitationDeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity('rating_access_invitations')
@Index('idx_rating_invitation_requester_status', ['requesterId', 'status'])
export class RatingInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'requester_id', type: 'int' })
  requesterId: number;

  @Column({ name: 'recipient_email', type: 'varchar', length: 255 })
  recipientEmail: string;

  @Column({ name: 'token_hash', type: 'char', length: 64, unique: true })
  tokenHash: string;

  @Column({ type: 'varchar', length: 20, default: RatingInvitationStatus.ACTIVE })
  status: RatingInvitationStatus;

  @Column({ name: 'created_by_id', type: 'int' })
  createdById: number;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'datetime', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'last_accessed_at', type: 'datetime', nullable: true })
  lastAccessedAt: Date | null;

  @Column({ name: 'verified_at', type: 'datetime', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'otp_hash', type: 'char', length: 64, nullable: true })
  otpHash: string | null;

  @Column({ name: 'otp_expires_at', type: 'datetime', nullable: true })
  otpExpiresAt: Date | null;

  @Column({ name: 'otp_attempts', type: 'smallint', unsigned: true, default: 0 })
  otpAttempts: number;

  @Column({ name: 'otp_sent_at', type: 'datetime', nullable: true })
  otpSentAt: Date | null;

  @Column({ name: 'session_hash', type: 'char', length: 64, nullable: true })
  sessionHash: string | null;

  @Column({ name: 'session_expires_at', type: 'datetime', nullable: true })
  sessionExpiresAt: Date | null;

  @Column({
    name: 'email_delivery_status',
    type: 'varchar',
    length: 20,
    default: RatingInvitationDeliveryStatus.PENDING,
  })
  emailDeliveryStatus: RatingInvitationDeliveryStatus;

  @Column({ name: 'email_sent_at', type: 'datetime', nullable: true })
  emailSentAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('rating_access_invitation_tickets')
@Index('uq_rating_invitation_ticket', ['invitationId', 'ticketId'], { unique: true })
export class RatingInvitationTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'invitation_id', type: 'varchar', length: 36 })
  invitationId: string;

  @Column({ name: 'ticket_id', type: 'varchar', length: 36 })
  ticketId: string;

  @Column({ name: 'rated_at', type: 'datetime', nullable: true })
  ratedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('rating_access_events')
@Index('idx_rating_access_event_invitation_created', ['invitationId', 'createdAt'])
export class RatingInvitationEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'invitation_id', type: 'varchar', length: 36 })
  invitationId: string;

  @Column({ name: 'ticket_id', type: 'varchar', length: 36, nullable: true })
  ticketId: string | null;

  @Column({ name: 'event_type', type: 'varchar', length: 50 })
  eventType: string;

  @Column({ name: 'actor_id', type: 'int', nullable: true })
  actorId: number | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;

  @Column({ type: 'text', nullable: true })
  metadata: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { dateTransformer } from './date.transformer';

export enum DutyType {
  OD = 'OD',
  ROC = 'ROC',
  OPCEN = 'OPCEN',
  CONFERENCE = 'CONFERENCE',
}

export enum DutyExceptionType {
  TRAVEL_ORDER = 'travel_order',
  EXAM = 'exam',
  ASSISTANCE = 'assistance',
  PACD = 'pacd',
  CANVASS = 'canvass',
  DUE_TO_TA = 'due_to_ta',
  OTHER = 'other',
}

export enum DutyReservationStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum DutyCoverageStatus {
  ACTIVE = 'active',
  RELEASED = 'released',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  INTERVENTION_REQUIRED = 'intervention_required',
}

@Entity('duty_roster_memberships')
@Unique(['userId'])
export class DutyRosterMembership {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id', type: 'int' }) userId: number;
  // Retained as a storage discriminator for existing databases; all shared-roster rows use OD.
  @Column({ name: 'duty_type', type: 'varchar', length: 20, default: DutyType.OD }) dutyType: DutyType;
  @Column({ name: 'sort_order', type: 'int', default: 0 }) sortOrder: number;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

@Entity('duty_assignments')
@Unique(['dutyDate', 'userId', 'dutyType'])
export class DutyAssignment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'duty_date', type: 'date', transformer: dateTransformer }) dutyDate: string;
  @Column({ name: 'user_id', type: 'int' }) userId: number;
  @Column({ name: 'duty_type', type: 'varchar', length: 20 }) dutyType: DutyType;
  @Column({ type: 'text', nullable: true }) remarks: string | null;
  @Column({ type: 'varchar', length: 20, default: 'manual' }) source: string;
  @Column({ name: 'created_by_id', type: 'int', nullable: true }) createdById: number | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

@Entity('duty_exceptions')
@Unique(['exceptionDate', 'userId', 'dutyType'])
export class DutyException {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'exception_date', type: 'date', transformer: dateTransformer }) exceptionDate: string;
  @Column({ name: 'user_id', type: 'int' }) userId: number;
  /** Null means this exception applies to every duty rotation for the date. */
  @Column({ name: 'duty_type', type: 'varchar', length: 20, nullable: true }) dutyType: DutyType | null;
  @Column({ type: 'varchar', length: 30 }) type: DutyExceptionType;
  @Column({ type: 'text', nullable: true }) remarks: string | null;
  @Column({ name: 'created_by_id', type: 'int', nullable: true }) createdById: number | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

@Entity('duty_meeting_reservations')
export class DutyMeetingReservation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'meeting_date', type: 'date', transformer: dateTransformer }) meetingDate: string;
  @Column({ name: 'venue_type', type: 'varchar', length: 20 }) venueType: DutyType;
  @Column({ name: 'start_time', type: 'time', nullable: true }) startTime: string | null;
  @Column({ name: 'end_time', type: 'time', nullable: true }) endTime: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) purpose: string | null;
  @Column({ type: 'text', nullable: true }) remarks: string | null;
  @Column({ type: 'varchar', length: 20, default: DutyReservationStatus.SCHEDULED }) status: DutyReservationStatus;
  @Column({ name: 'created_by_id', type: 'int' }) createdById: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

@Entity('duty_daily_coverages')
@Unique(['dutyDate', 'dutyType'])
export class DutyDailyCoverage {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'duty_date', type: 'date', transformer: dateTransformer }) dutyDate: string;
  @Column({ name: 'duty_type', type: 'varchar', length: 20 }) dutyType: DutyType;
  @Column({ name: 'primary_user_id', type: 'int' }) primaryUserId: number;
  @Column({ name: 'assigned_user_id', type: 'int', nullable: true }) assignedUserId: number | null;
  @Column({ name: 'is_substitute', type: 'boolean', default: false }) isSubstitute: boolean;
  @Column({ name: 'substitution_reason', type: 'text', nullable: true }) substitutionReason: string | null;
  @Column({ type: 'varchar', length: 30, default: DutyCoverageStatus.ACTIVE }) status: DutyCoverageStatus;
  @Column({ name: 'previous_attendance_status', type: 'varchar', length: 20, nullable: true }) previousAttendanceStatus: string | null;
  @Column({ name: 'previous_attendance_notes', type: 'text', nullable: true }) previousAttendanceNotes: string | null;
  @Column({ name: 'attendance_overridden', type: 'boolean', default: false }) attendanceOverridden: boolean;
  @Column({ name: 'released_at', type: 'datetime', nullable: true }) releasedAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

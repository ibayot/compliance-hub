import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Unit } from '../../units/entities/unit.entity';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  SECTION_HEAD = 'section_head',
  USER = 'user',
  // v0.6.14: RICTMS-specific named roles (use roleCode for feature routing)
  COMPLIANCE_OFFICER = 'compliance_officer',
  CYBERSEC = 'cybersec',
  INFOSEC = 'infosec',
  PROJECT_MGR = 'project_mgr',
  DEV_LEAD = 'dev_lead',
  SQA_LEAD = 'sqa_lead',
  LEAD_INFRA = 'lead_infra',
  SERVER_ADMIN = 'server_admin',
  DB_ADMIN = 'db_admin',
  NETWORK_ADMIN = 'network_admin',
  DESKTOP_SR = 'desktop_sr',
  IT_SUPPORT_SR = 'it_support_sr',
  DESKTOP_JR = 'desktop_jr',
  IT_SUPPORT_JR = 'it_support_jr',
  PANTAWID_ICT = 'pantawid_ict',
  RECORDS_OFFICER = 'records_officer',
  HR_ID_OFFICER = 'hr_id_officer',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  passwordHash: string;

  @Column({ name: 'mfa_code', nullable: true })
  @Exclude()
  mfaCode: string;

  @Column({ name: 'mfa_expires_at', type: 'timestamp', nullable: true })
  mfaExpiresAt: Date;

  @Column({ name: 'mfa_last_verified_at', type: 'timestamp', nullable: true })
  mfaLastVerifiedAt: Date;

  @Column({ name: 'first_name', nullable: true, length: 100 })
  firstName: string;

  @Column({ name: 'middle_name', nullable: true, length: 100 })
  middleName: string;

  @Column({ name: 'last_name', nullable: true, length: 100 })
  lastName: string;

  @Column({ name: 'suffix', nullable: true, length: 5 })
  suffix: string;

  @Column({ name: 'phone_number', nullable: true })
  phoneNumber: string;

  @Column({ name: 'sex', nullable: true })
  sex: string;

  @Column({ name: 'staff_id', nullable: true, length: 6 })
  staffId: string;

  @Column({ name: 'position', nullable: true, length: 12 })
  position: string;

  @Column({ name: 'position_full', nullable: true, length: 100 })
  positionFull: string;

  @Column({ name: 'designation', nullable: true, length: 100 })
  designation: string;

  @Column({ name: 'ticket_main_focal', default: false })
  ticketMainFocal: boolean;

  @Column({ name: 'ticket_technician', default: false })
  ticketTechnician: boolean;

  @Column({ name: 'auth_provider', type: 'enum', enum: AuthProvider, default: AuthProvider.LOCAL })
  authProvider: AuthProvider;

  @Column({ name: 'google_sub', type: 'varchar', nullable: true, unique: true })
  googleSub: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: true })
  active: boolean;

  @ManyToMany(() => Unit, (unit) => unit.users)
  @JoinTable({
    name: 'user_unit_access',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'unit_id', referencedColumnName: 'id' },
  })
  units: Unit[];

  @Column({ name: 'last_login', type: 'datetime', nullable: true })
  lastLogin: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Unit } from '../../units/entities/unit.entity';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  REVIEWER = 'reviewer',
  FOCAL = 'focal',
  TECHNICIAN = 'technician',
  TECHNICIAN_DESKTOP = 'technician_desktop',
  TECHNICIAN_IT_SUPPORT = 'technician_it_support',
  TECHNICIAN_IT_STAFF = 'technician_it_staff',
  TECHNICIAN_DESKTOP_STAFF = 'technician_desktop_staff',
  AUDITOR = 'auditor',
  USER = 'user',
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

  @Column({ name: 'first_name', nullable: true })
  firstName: string;

  @Column({ name: 'middle_name', nullable: true })
  middleName: string;

  @Column({ name: 'last_name', nullable: true })
  lastName: string;

  @Column({ name: 'suffix', nullable: true })
  suffix: string;

  @Column({ name: 'staff_id', nullable: true })
  staffId: string;

  @Column({ name: 'position', nullable: true })
  position: string;

  @Column({ name: 'position_full', nullable: true })
  positionFull: string;

  @Column({ name: 'designation', nullable: true })
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
    default: UserRole.FOCAL,
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

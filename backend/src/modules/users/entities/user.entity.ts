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
  AUDITOR = 'auditor',
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

  @Column({ name: 'last_name', nullable: true })
  lastName: string;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('security_config')
export class SecurityConfig {
  @PrimaryColumn()
  id: number;

  @Column({ name: 'default_password', default: 'Changeme123!@#' })
  defaultPassword: string;

  @Column({ name: 'mfa_test_mode', default: false })
  mfaTestMode: boolean;
}

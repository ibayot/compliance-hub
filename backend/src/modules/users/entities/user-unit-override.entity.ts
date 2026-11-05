import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Protects a manually selected operational unit during automatic UMS sync.
 * Explicit administrator force sync clears it after applying the valid UMS unit.
 * Administrator and self-service profile changes create the same override.
 */
@Entity('user_unit_overrides')
export class UserUnitOverride {
  @PrimaryColumn({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'unit_id', type: 'int' })
  unitId: number;

  @Column({ name: 'overridden_at', type: 'datetime', precision: 6 })
  overriddenAt: Date;

  @Column({ name: 'overridden_by', type: 'int' })
  overriddenBy: number;
}

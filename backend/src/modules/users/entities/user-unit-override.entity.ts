import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Keeps a manually selected operational unit authoritative until UMS reports
 * the same unit. Both administrator changes and self-service profile changes
 * create the same lightweight override.
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

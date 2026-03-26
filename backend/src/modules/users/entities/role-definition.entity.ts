import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('role_definitions')
export class RoleDefinitionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  value: string;

  @Column()
  label: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ default: true })
  assignable: boolean;

  @Column({ name: 'is_system', default: true })
  isSystem: boolean;

  /**
   * Optional tag to include users with this custom role in the technician attendance grid.
   * Values: null (not a technician) | 'it_support' | 'desktop_support' | 'pantawid_ict_support'
   */
  @Column({ name: 'technician_type', type: 'varchar', length: 30, nullable: true, default: null })
  technicianType: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

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


  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

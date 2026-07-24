import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('units')
export class Unit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({ default: true })
  active: boolean;

  @ManyToMany(() => User, (user) => user.units)
  users: User[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

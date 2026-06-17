import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('ticketing_configs')
export class TicketingConfig {
  @PrimaryColumn('int')
  id: number;

  @Column({ name: 'assignment_strategy', type: 'varchar', length: 50, default: 'CURRENT_AUTO' })
  assignmentStrategy: string;

  @Column({ name: 'round_robin_cap_hours', type: 'int', default: 80 })
  roundRobinCapHours: number;
}

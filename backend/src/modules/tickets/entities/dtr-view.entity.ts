import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'vw_rictms_clock_in', synchronize: false, database: '02_db_stg_compliance_hub_users' })
export class DtrView {
  @PrimaryColumn({ name: 'emp_code' })
  empCode: string;

  @Column({ name: 'work_date', type: 'date' })
  workDate: string;

  @Column({ name: 'first_clock_in_time', type: 'datetime' })
  firstClockInTime: Date;

  @Column({ name: 'arrival_session', nullable: true })
  arrivalSession: string;
}

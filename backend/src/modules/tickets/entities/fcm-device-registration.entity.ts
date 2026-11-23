import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('fcm_device_registrations')
@Index('uq_fcm_device_id', ['deviceId'], { unique: true })
@Index('uq_fcm_fid_hash', ['fidHash'], { unique: true })
@Index('idx_fcm_user', ['userId'])
export class FcmDeviceRegistration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'device_id', type: 'char', length: 36 })
  deviceId: string;

  @Column({ name: 'fid_hash', type: 'char', length: 64 })
  fidHash: string;

  @Column({ name: 'encrypted_fid', type: 'text' })
  encryptedFid: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

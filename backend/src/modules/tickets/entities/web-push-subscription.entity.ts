import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('web_push_subscriptions')
@Index('uq_web_push_endpoint_hash', ['endpointHash'], { unique: true })
@Index('idx_web_push_user', ['userId'])
export class WebPushSubscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'endpoint_hash', type: 'char', length: 64 })
  endpointHash: string;

  @Column({ name: 'encrypted_subscription', type: 'text' })
  encryptedSubscription: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

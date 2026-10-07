import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Feedback } from './feedback.entity';

@Entity('feedback_attachments')
export class FeedbackAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'feedback_id', type: 'int' })
  feedbackId: number;

  @ManyToOne(() => Feedback, (feedback) => feedback.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'feedback_id' })
  feedback: Feedback;

  @Column({ name: 'original_file_name', type: 'varchar', length: 255 })
  originalFileName: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 80 })
  mimeType: string;

  @Column({ name: 'file_size', type: 'int', unsigned: true })
  fileSize: number;

  @Column({ type: 'char', length: 64 })
  sha256: string;

  @Column({ name: 'file_blob', type: 'longblob', select: false })
  fileBlob: Buffer;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

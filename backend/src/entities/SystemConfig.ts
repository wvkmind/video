import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('system_configs')
export class SystemConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ComfyUI configuration
  @Column({ type: 'varchar', length: 500, default: 'http://localhost:8188' })
  comfyuiBaseUrl!: string;

  @Column({ type: 'integer', default: 300 })
  comfyuiTimeout!: number;

  // Poe API configuration
  @Column({ type: 'varchar', length: 500, nullable: true })
  poeApiKey?: string;

  @Column({ type: 'varchar', length: 100, default: 'gpt-5.1' })
  poeModel!: string;

  @Column({ type: 'varchar', length: 500, default: 'https://api.poe.com/v1/chat/completions' })
  poeApiUrl!: string;

  // File storage configuration
  @Column({ type: 'varchar', length: 500, default: './storage' })
  storageBasePath!: string;

  // FFmpeg configuration
  @Column({ type: 'varchar', length: 500, default: 'ffmpeg' })
  ffmpegPath!: string;

  @UpdateDateColumn()
  updatedAt!: Date;
}

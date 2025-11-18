import { DataSource } from 'typeorm';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const dbType = process.env.DB_TYPE || 'sqlite';

export const AppDataSource = new DataSource(
  dbType === 'postgres'
    ? {
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_DATABASE || 'ai_video_production',
        synchronize: !isProduction,
        logging: !isProduction,
        entities: [__dirname + '/../entities/**/*.{ts,js}'],
        migrations: [__dirname + '/../migrations/**/*.{ts,js}'],
      }
    : {
        type: 'better-sqlite3',
        database: process.env.DB_PATH || './dev.sqlite',
        synchronize: true,
        logging: !isProduction,
        entities: [__dirname + '/../entities/**/*.{ts,js}'],
        migrations: [__dirname + '/../migrations/**/*.{ts,js}'],
      }
);

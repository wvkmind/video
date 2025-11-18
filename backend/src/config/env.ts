import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '5000'),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  database: {
    type: process.env.DB_TYPE || 'sqlite',
    path: process.env.DB_PATH || './dev.sqlite',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'ai_video_production',
  },
  comfyui: {
    baseUrl: process.env.COMFYUI_BASE_URL || 'http://localhost:8188',
    timeout: parseInt(process.env.COMFYUI_TIMEOUT || '300'),
  },
  poe: {
    apiKey: process.env.POE_API_KEY || '',
    model: process.env.POE_MODEL || 'gpt-5.1',
    apiUrl: process.env.POE_API_URL || 'https://api.poe.com/v1/chat/completions',
  },
  storage: {
    basePath: process.env.STORAGE_BASE_PATH || './storage',
  },
  ffmpeg: {
    path: process.env.FFMPEG_PATH || 'ffmpeg',
  },
};

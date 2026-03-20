import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/weat',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  exa: {
    apiKey: process.env.EXA_API_KEY || '',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  upload: {
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '8', 10),
    dir: process.env.UPLOAD_DIR || './uploads',
  },
} as const;

import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory or root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/stockflow_db?schema=public',
  directUrl: process.env.DIRECT_URL || process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/stockflow_db?schema=public',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  jwtSecret: process.env.JWT_SECRET || 'stockflow-hackathon-super-secret-jwt-key-2026',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
};

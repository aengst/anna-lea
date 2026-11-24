import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ladda .env från projektroten (lokal utveckling) eller server-mappen
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const { Pool } = pg;

function buildPoolConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5440),
    user: process.env.DB_USER || 'annalea_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'annalea_dev',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
}

export const pool = new Pool(buildPoolConfig());

export async function query(text, params) {
  return pool.query(text, params);
}

export async function initDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schemaSql);

  const initialAdmin = (process.env.INITIAL_ADMIN_EMAIL || '').trim().toLowerCase();
  if (initialAdmin) {
    await pool.query(
      `INSERT INTO admin_users (email, name, added_by)
       VALUES ($1, 'Grund-admin', 'env')
       ON CONFLICT (email) DO NOTHING`,
      [initialAdmin]
    );
  }
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { initDatabase, pool } from './db/index.js';
import { ensureUploadDir, getUploadDir } from './services/storage.js';
import { renderSpaWithSeo } from './services/seo.js';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

let APP_VERSION = '0.0.0';
try {
  const rootPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
  APP_VERSION = rootPkg.version || APP_VERSION;
} catch {
  // Ignorera om package.json saknas
}

const app = express();
const PORT = Number(process.env.PORT || 3004);

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:', 'blob:', 'https://lh3.googleusercontent.com'],
      },
    },
  })
);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://anna-lea.com',
  'https://www.anna-lea.com',
  'http://localhost:5176',
  'https://localhost:5176',
].filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  return /^https:\/\/([a-z0-9-]+\.)?(minaloggar\.se|anna-lea\.se|anna-lea\.com)$/i.test(origin);
}

app.use(
  cors({
    origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'För många förfrågningar, vänta en kort stund.' },
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'För många inloggningsförsök. Försök igen senare.' },
});

// Uppladdade optimerade bilder med lång cache (immutabla unika filnamn)
const uploadDir = getUploadDir();
app.use(
  '/uploads',
  express.static(uploadDir, {
    maxAge: '365d',
    immutable: true,
  })
);

// Hälsokontroll (inkl. aktuell version från rotens package.json)
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({
      status: 'ok',
      service: 'anna-lea-api',
      version: APP_VERSION,
      db: 'connected',
    });
  } catch {
    return res.status(200).json({
      status: 'degraded',
      service: 'anna-lea-api',
      version: APP_VERSION,
      db: 'disconnected',
    });
  }
});

// API-rutter
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/public', apiLimiter, publicRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);

// 404 för okända API-anrop
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API-resursen hittades inte.' });
});

// Statiska frontend-filer i produktion + SPA-fallback med SEO/Open Graph-injektion
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir, { index: false }));
  app.get('*', (req, res) => renderSpaWithSeo(req, res, publicDir));
}

async function start() {
  await ensureUploadDir();

  try {
    await initDatabase();
    console.log('🗄️  Databasschema verifierat.');
  } catch (err) {
    console.warn('⚠️  Kunde inte ansluta/initiera databas vid uppstart:', err.message);
    console.warn('    Kontrollera .env och att PostgreSQL körs.');
  }

  app.listen(PORT, () => {
    console.log(`✨ anna-lea server lyssnar på port ${PORT}`);
  });
}

start();

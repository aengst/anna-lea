import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import {
  AUTH_COOKIE_NAME,
  getAdminFromRequest,
  getInitialAdminEmail,
  isAuthorizedAdminEmail,
} from '../middleware/auth.js';

const router = express.Router();

function createOAuthClient() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
}

function getRedirectUri(req) {
  if (process.env.AUTH_REDIRECT_URI) return process.env.AUTH_REDIRECT_URI;
  const base = (process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  return `${base}/api/auth/callback`;
}

function getFrontendBase(req) {
  return (process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

// 1. Skicka användaren till Googles inloggningssida
router.get('/google', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      error: 'Google OAuth är inte konfigurerat ännu (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET saknas).',
    });
  }

  const client = createOAuthClient();
  const url = client.generateAuthUrl({
    access_type: 'online',
    scope: ['profile', 'email'],
    redirect_uri: getRedirectUri(req),
  });

  return res.redirect(url);
});

// 2. Callback från Google
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  const frontendBase = getFrontendBase(req);

  if (error || !code) {
    return res.redirect(`${frontendBase}/admin?authError=cancelled`);
  }

  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET saknas i miljövariablerna.');
    return res.redirect(`${frontendBase}/admin?authError=config`);
  }

  try {
    const client = createOAuthClient();
    const { tokens } = await client.getToken({
      code: String(code),
      redirect_uri: getRedirectUri(req),
    });

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = (payload?.email || '').trim().toLowerCase();
    const name = payload?.name || '';
    const picture = payload?.picture || '';

    const authorized = await isAuthorizedAdminEmail(email);
    if (!authorized) {
      console.warn(`🛑 Obehörigt admin-inloggningsförsök: ${email}`);
      return res.redirect(`${frontendBase}/admin?authError=unauthorized&email=${encodeURIComponent(email)}`);
    }

    // Spara eller uppdatera namn i admin_users om det är grund-admin eller befintlig admin
    if (email === getInitialAdminEmail()) {
      await query(
        `INSERT INTO admin_users (email, name, added_by)
         VALUES ($1, $2, 'env')
         ON CONFLICT (email) DO UPDATE SET name = COALESCE(NULLIF($2, ''), admin_users.name)`,
        [email, name]
      );
    } else if (name) {
      await query(
        `UPDATE admin_users SET name = $2 WHERE LOWER(email) = $1 AND (name IS NULL OR name = '')`,
        [email, name]
      );
    }

    const token = jwt.sign(
      { email, name, picture },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd || req.secure || req.get('x-forwarded-proto') === 'https',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.redirect(`${frontendBase}/admin`);
  } catch (err) {
    console.error('❌ Fel vid Google OAuth-callback:', err.message);
    return res.redirect(`${frontendBase}/admin?authError=failed`);
  }
});

// 3. Kontrollera inloggad administratör
router.get('/me', async (req, res) => {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return res.json({ authenticated: false, user: null });
    }
    return res.json({ authenticated: true, user: admin });
  } catch (err) {
    console.error('Fel i /api/auth/me:', err.message);
    return res.status(500).json({ error: 'Kunde inte hämta inloggningsstatus.' });
  }
});

// 4. Logga ut
router.post('/logout', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd || req.secure || req.get('x-forwarded-proto') === 'https',
    sameSite: 'lax',
    path: '/',
  });
  return res.json({ ok: true });
});

export default router;

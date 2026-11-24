import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';

export const AUTH_COOKIE_NAME = 'anna_lea_auth';

export function getInitialAdminEmail() {
  return (process.env.INITIAL_ADMIN_EMAIL || '').trim().toLowerCase();
}

export async function isAuthorizedAdminEmail(email) {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === getInitialAdminEmail()) return true;
  const res = await query('SELECT id FROM admin_users WHERE LOWER(email) = $1 LIMIT 1', [normalized]);
  return res.rows.length > 0;
}

export async function getAdminFromRequest(req) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token || !process.env.JWT_SECRET) return null;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const allowed = await isAuthorizedAdminEmail(payload.email);
    if (!allowed) return null;
    return {
      email: payload.email.toLowerCase(),
      name: payload.name || '',
      picture: payload.picture || '',
    };
  } catch {
    return null;
  }
}

export async function requireAdmin(req, res, next) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return res.status(401).json({ error: 'Inloggning som administratör krävs.' });
    }
    req.admin = admin;
    return next();
  } catch (err) {
    console.error('Auth-fel:', err);
    return res.status(500).json({ error: 'Kunde inte verifiera behörighet.' });
  }
}

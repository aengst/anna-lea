import express from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '../db/index.js';
import { DEFAULT_SETTINGS } from '../services/defaults.js';

const router = express.Router();

const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Du har skickat många förfrågningar på kort tid. Vänta en stund och försök igen.' },
});

async function loadSettingsMap() {
  const res = await query('SELECT key, value FROM site_settings');
  const map = {
    theme: { ...DEFAULT_SETTINGS.theme },
    layout: { ...DEFAULT_SETTINGS.layout },
    contact: { ...DEFAULT_SETTINGS.contact },
  };
  for (const row of res.rows) {
    if (map[row.key]) {
      map[row.key] = { ...map[row.key], ...(row.value || {}) };
    } else {
      map[row.key] = row.value;
    }
  }
  return map;
}

async function attachMedia(entityType, rows) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const mediaRes = await query(
    `SELECT id, entity_id, url_large, url_thumb, alt_text, caption, width, height, sort_order, is_primary
     FROM media
     WHERE entity_type = $1 AND entity_id = ANY($2::int[])
     ORDER BY is_primary DESC, sort_order ASC, id ASC`,
    [entityType, ids]
  );

  const byEntity = new Map();
  for (const m of mediaRes.rows) {
    if (!byEntity.has(m.entity_id)) byEntity.set(m.entity_id, []);
    byEntity.get(m.entity_id).push(m);
  }

  return rows.map((row) => ({
    ...row,
    media: byEntity.get(row.id) || [],
  }));
}

// Hämta grunddata (tema, layout, kontaktinfo och sidtitlar) i ett anrop
router.get('/bootstrap', async (_req, res) => {
  try {
    const [settings, pagesRes] = await Promise.all([
      loadSettingsMap(),
      query('SELECT slug, title, content, updated_at FROM pages ORDER BY slug ASC'),
    ]);

    const pages = {};
    for (const p of pagesRes.rows) {
      pages[p.slug] = p;
    }

    return res.json({ settings, pages });
  } catch (err) {
    console.error('Fel i /api/public/bootstrap:', err.message);
    return res.status(500).json({ error: 'Kunde inte ladda siddata.' });
  }
});

// Lista publicerade smycken
router.get('/jewelry', async (req, res) => {
  try {
    const { category } = req.query;
    const params = [];
    let sql = `
      SELECT id, slug, title, category, price_label, variants, description, story, status, sort_order
      FROM jewelry_items
      WHERE is_published = TRUE
    `;
    if (category && ['smycken', 'unika_bestallningar'].includes(String(category))) {
      params.push(String(category));
      sql += ` AND category = $1`;
    }
    sql += ` ORDER BY sort_order ASC, id ASC`;

    const result = await query(sql, params);
    const items = await attachMedia('jewelry', result.rows);
    return res.json({ items });
  } catch (err) {
    console.error('Fel i /api/public/jewelry:', err.message);
    return res.status(500).json({ error: 'Kunde inte hämta smycken.' });
  }
});

// Detaljsida för ett smycke
router.get('/jewelry/:slug', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, slug, title, category, price_label, variants, description, story, status, sort_order
       FROM jewelry_items
       WHERE slug = $1 AND is_published = TRUE`,
      [req.params.slug]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Smycket hittades inte.' });
    }
    const [item] = await attachMedia('jewelry', result.rows);
    return res.json({ item });
  } catch (err) {
    console.error('Fel i /api/public/jewelry/:slug:', err.message);
    return res.status(500).json({ error: 'Kunde inte hämta smycket.' });
  }
});

// Lista publicerade konstverk och projekt
router.get('/art', async (req, res) => {
  try {
    const { type } = req.query;
    const params = [];
    let sql = `
      SELECT id, slug, title, entry_type, parent_project_id, description, year, technique,
             dimensions, location, price_label, status, allow_inquiry, sort_order
      FROM art_entries
      WHERE is_published = TRUE
    `;
    if (type && ['artwork', 'project'].includes(String(type))) {
      params.push(String(type));
      sql += ` AND entry_type = $1`;
    }
    sql += ` ORDER BY sort_order ASC, id DESC`;

    const result = await query(sql, params);
    const items = await attachMedia('art', result.rows);
    return res.json({ items });
  } catch (err) {
    console.error('Fel i /api/public/art:', err.message);
    return res.status(500).json({ error: 'Kunde inte hämta konst.' });
  }
});

// Detaljsida för konstverk eller projekt (inkl. ev. tillhörande verk i ett projekt)
router.get('/art/:slug', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, slug, title, entry_type, parent_project_id, description, year, technique,
              dimensions, location, price_label, status, allow_inquiry, sort_order
       FROM art_entries
       WHERE slug = $1 AND is_published = TRUE`,
      [req.params.slug]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Konstverket hittades inte.' });
    }
    const [entry] = await attachMedia('art', result.rows);

    let children = [];
    if (entry.entry_type === 'project') {
      const childRes = await query(
        `SELECT id, slug, title, entry_type, parent_project_id, description, year, technique,
                dimensions, location, price_label, status, allow_inquiry, sort_order
         FROM art_entries
         WHERE parent_project_id = $1 AND is_published = TRUE
         ORDER BY sort_order ASC, id ASC`,
        [entry.id]
      );
      children = await attachMedia('art', childRes.rows);
    }

    return res.json({ item: entry, children });
  } catch (err) {
    console.error('Fel i /api/public/art/:slug:', err.message);
    return res.status(500).json({ error: 'Kunde inte hämta konstverket.' });
  }
});

// Hämta en redigerbar informationssida
router.get('/pages/:slug', async (req, res) => {
  try {
    const result = await query(
      'SELECT slug, title, content, updated_at FROM pages WHERE slug = $1',
      [req.params.slug]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Sidan hittades inte.' });
    }
    return res.json({ page: result.rows[0] });
  } catch (err) {
    console.error('Fel i /api/public/pages/:slug:', err.message);
    return res.status(500).json({ error: 'Kunde inte hämta sidan.' });
  }
});

// Skicka beställning eller förfrågan (sparas i admin-inkorgen)
router.post('/inquiries', inquiryLimiter, async (req, res) => {
  try {
    const {
      inquiry_type = 'contact',
      entity_type = '',
      entity_id = null,
      item_title = '',
      variant_choice = '',
      customer_name = '',
      customer_email = '',
      customer_phone = '',
      message = '',
      website = '', // osynligt honeypot-fält mot bottar
    } = req.body || {};

    // Om en bot fyller i det dolda fältet, låtsas som att allt gick bra men spara inte
    if (String(website).trim().length > 0) {
      return res.status(201).json({ ok: true });
    }

    const cleanName = String(customer_name).trim();
    const cleanEmail = String(customer_email).trim();
    const cleanPhone = String(customer_phone).trim();
    const cleanMessage = String(message).trim();

    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({ error: 'Vänligen ange ditt namn.' });
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Vänligen ange en giltig e-postadress.' });
    }
    if (cleanMessage.length > 5000) {
      return res.status(400).json({ error: 'Meddelandet är för långt (max 5000 tecken).' });
    }

    const allowedTypes = ['jewelry_order', 'custom_request', 'art_inquiry', 'contact'];
    const safeType = allowedTypes.includes(inquiry_type) ? inquiry_type : 'contact';

    await query(
      `INSERT INTO inquiries
        (inquiry_type, entity_type, entity_id, item_title, variant_choice,
         customer_name, customer_email, customer_phone, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        safeType,
        String(entity_type || '').slice(0, 40),
        entity_id ? Number(entity_id) : null,
        String(item_title || '').slice(0, 200),
        String(variant_choice || '').slice(0, 200),
        cleanName.slice(0, 150),
        cleanEmail.slice(0, 200),
        cleanPhone.slice(0, 60),
        cleanMessage,
      ]
    );

    return res.status(201).json({
      ok: true,
      message: 'Tack! Din förfrågan har skickats till Anna-Lea.',
    });
  } catch (err) {
    console.error('Fel vid spara förfrågan:', err.message);
    return res.status(500).json({ error: 'Kunde inte skicka din förfrågan just nu. Försök igen.' });
  }
});

export default router;

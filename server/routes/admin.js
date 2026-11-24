import express from 'express';
import multer from 'multer';
import { query } from '../db/index.js';
import { getInitialAdminEmail, requireAdmin } from '../middleware/auth.js';
import { processAndSaveImage } from '../services/imageProcessor.js';
import { deleteFileByUrl } from '../services/storage.js';
import { DEFAULT_SETTINGS } from '../services/defaults.js';

const router = express.Router();

// Allt under /api/admin kräver inloggad administratör
router.use(requireAdmin);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB per fil (klarar högupplösta mobilfoton)
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    return cb(new Error('Endast bildfiler (JPEG, PNG, WebP, HEIC/AVIF) är tillåtna.'));
  },
});

function slugify(input = '') {
  return String(input)
    .toLowerCase()
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `objekt-${Date.now()}`;
}

async function ensureUniqueSlug(table, baseSlug, excludeId = null) {
  let candidate = slugify(baseSlug);
  let counter = 2;
  while (true) {
    const res = excludeId
      ? await query(`SELECT id FROM ${table} WHERE slug = $1 AND id <> $2`, [candidate, excludeId])
      : await query(`SELECT id FROM ${table} WHERE slug = $1`, [candidate]);
    if (res.rows.length === 0) return candidate;
    candidate = `${slugify(baseSlug)}-${counter}`;
    counter += 1;
  }
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
  const map = new Map();
  for (const m of mediaRes.rows) {
    if (!map.has(m.entity_id)) map.set(m.entity_id, []);
    map.get(m.entity_id).push(m);
  }
  return rows.map((r) => ({ ...r, media: map.get(r.id) || [] }));
}

// ============================================================
// ÖVERSIKT / STATISTIK
// ============================================================
router.get('/stats', async (_req, res) => {
  try {
    const [jRes, aRes, iRes, uRes] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM jewelry_items'),
      query('SELECT COUNT(*)::int AS count FROM art_entries'),
      query("SELECT COUNT(*)::int AS count FROM inquiries WHERE status = 'new'"),
      query('SELECT COUNT(*)::int AS count FROM admin_users'),
    ]);
    return res.json({
      jewelryCount: jRes.rows[0].count,
      artCount: aRes.rows[0].count,
      unreadInquiries: iRes.rows[0].count,
      adminCount: uRes.rows[0].count,
    });
  } catch (err) {
    console.error('Fel i /api/admin/stats:', err.message);
    return res.status(500).json({ error: 'Kunde inte hämta statistik.' });
  }
});

// ============================================================
// SMYCKEN
// ============================================================
router.get('/jewelry', async (_req, res) => {
  try {
    const result = await query(
      `SELECT * FROM jewelry_items ORDER BY category ASC, sort_order ASC, id ASC`
    );
    const items = await attachMedia('jewelry', result.rows);
    return res.json({ items });
  } catch (err) {
    console.error('Fel i GET /api/admin/jewelry:', err.message);
    return res.status(500).json({ error: 'Kunde inte hämta smycken.' });
  }
});

router.post('/jewelry', async (req, res) => {
  try {
    const {
      title,
      slug,
      category = 'smycken',
      price_label = '',
      variants = [],
      description = '',
      story = '',
      status = 'available',
      is_published = true,
    } = req.body || {};

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Titel krävs.' });
    }

    const safeCat = ['smycken', 'unika_bestallningar'].includes(category) ? category : 'smycken';
    const safeStatus = ['available', 'sold', 'on_request'].includes(status) ? status : 'available';
    const uniqueSlug = await ensureUniqueSlug('jewelry_items', slug || title);
    const orderRes = await query(
      'SELECT COALESCE(MAX(sort_order), -1)::int + 1 AS next_order FROM jewelry_items WHERE category = $1',
      [safeCat]
    );

    const inserted = await query(
      `INSERT INTO jewelry_items
        (slug, title, category, price_label, variants, description, story, status, sort_order, is_published)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        uniqueSlug,
        String(title).trim(),
        safeCat,
        String(price_label || '').trim(),
        JSON.stringify(Array.isArray(variants) ? variants : []),
        String(description || ''),
        String(story || ''),
        safeStatus,
        orderRes.rows[0].next_order,
        Boolean(is_published),
      ]
    );

    return res.status(201).json({ item: { ...inserted.rows[0], media: [] } });
  } catch (err) {
    console.error('Fel i POST /api/admin/jewelry:', err.message);
    return res.status(500).json({ error: 'Kunde inte skapa smycke.' });
  }
});

router.put('/jewelry/reorder', async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'Ogiltig sorteringslista.' });
    }
    for (let i = 0; i < ids.length; i += 1) {
      await query('UPDATE jewelry_items SET sort_order = $1 WHERE id = $2', [i, Number(ids[i])]);
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('Fel vid sortering av smycken:', err.message);
    return res.status(500).json({ error: 'Kunde inte spara ordning.' });
  }
});

router.put('/jewelry/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      title,
      slug,
      category = 'smycken',
      price_label = '',
      variants = [],
      description = '',
      story = '',
      status = 'available',
      is_published = true,
    } = req.body || {};

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Titel krävs.' });
    }

    const safeCat = ['smycken', 'unika_bestallningar'].includes(category) ? category : 'smycken';
    const safeStatus = ['available', 'sold', 'on_request'].includes(status) ? status : 'available';
    const uniqueSlug = await ensureUniqueSlug('jewelry_items', slug || title, id);

    const updated = await query(
      `UPDATE jewelry_items
       SET slug = $1, title = $2, category = $3, price_label = $4, variants = $5::jsonb,
           description = $6, story = $7, status = $8, is_published = $9
       WHERE id = $10
       RETURNING *`,
      [
        uniqueSlug,
        String(title).trim(),
        safeCat,
        String(price_label || '').trim(),
        JSON.stringify(Array.isArray(variants) ? variants : []),
        String(description || ''),
        String(story || ''),
        safeStatus,
        Boolean(is_published),
        id,
      ]
    );

    if (!updated.rows[0]) {
      return res.status(404).json({ error: 'Smycket hittades inte.' });
    }
    const [item] = await attachMedia('jewelry', updated.rows);
    return res.json({ item });
  } catch (err) {
    console.error('Fel i PUT /api/admin/jewelry/:id:', err.message);
    return res.status(500).json({ error: 'Kunde inte uppdatera smycke.' });
  }
});

router.delete('/jewelry/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const mediaRes = await query(
      "SELECT url_large, url_thumb FROM media WHERE entity_type = 'jewelry' AND entity_id = $1",
      [id]
    );
    await query("DELETE FROM media WHERE entity_type = 'jewelry' AND entity_id = $1", [id]);
    const delRes = await query('DELETE FROM jewelry_items WHERE id = $1 RETURNING id', [id]);
    if (!delRes.rows[0]) {
      return res.status(404).json({ error: 'Smycket hittades inte.' });
    }
    for (const m of mediaRes.rows) {
      await deleteFileByUrl(m.url_large);
      await deleteFileByUrl(m.url_thumb);
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('Fel i DELETE /api/admin/jewelry/:id:', err.message);
    return res.status(500).json({ error: 'Kunde inte ta bort smycke.' });
  }
});

// ============================================================
// KONST (ENSKILDA VERK & PROJEKT/SERIER)
// ============================================================
router.get('/art', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM art_entries ORDER BY sort_order ASC, id DESC');
    const items = await attachMedia('art', result.rows);
    return res.json({ items });
  } catch (err) {
    console.error('Fel i GET /api/admin/art:', err.message);
    return res.status(500).json({ error: 'Kunde inte hämta konst.' });
  }
});

router.post('/art', async (req, res) => {
  try {
    const {
      title,
      slug,
      entry_type = 'artwork',
      parent_project_id = null,
      description = '',
      year = '',
      technique = '',
      dimensions = '',
      location = '',
      price_label = '',
      status = 'none',
      allow_inquiry = true,
      is_published = true,
    } = req.body || {};

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Titel krävs.' });
    }

    const safeType = ['artwork', 'project'].includes(entry_type) ? entry_type : 'artwork';
    const safeStatus = ['available', 'sold', 'exhibited', 'none'].includes(status) ? status : 'none';
    const uniqueSlug = await ensureUniqueSlug('art_entries', slug || title);
    const orderRes = await query('SELECT COALESCE(MAX(sort_order), -1)::int + 1 AS next_order FROM art_entries');

    const inserted = await query(
      `INSERT INTO art_entries
        (slug, title, entry_type, parent_project_id, description, year, technique,
         dimensions, location, price_label, status, allow_inquiry, sort_order, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        uniqueSlug,
        String(title).trim(),
        safeType,
        safeType === 'artwork' && parent_project_id ? Number(parent_project_id) : null,
        String(description || ''),
        String(year || '').trim(),
        String(technique || '').trim(),
        String(dimensions || '').trim(),
        String(location || '').trim(),
        String(price_label || '').trim(),
        safeStatus,
        Boolean(allow_inquiry),
        orderRes.rows[0].next_order,
        Boolean(is_published),
      ]
    );

    return res.status(201).json({ item: { ...inserted.rows[0], media: [] } });
  } catch (err) {
    console.error('Fel i POST /api/admin/art:', err.message);
    return res.status(500).json({ error: 'Kunde inte skapa konstpost.' });
  }
});

router.put('/art/reorder', async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'Ogiltig sorteringslista.' });
    }
    for (let i = 0; i < ids.length; i += 1) {
      await query('UPDATE art_entries SET sort_order = $1 WHERE id = $2', [i, Number(ids[i])]);
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('Fel vid sortering av konst:', err.message);
    return res.status(500).json({ error: 'Kunde inte spara ordning.' });
  }
});

router.put('/art/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      title,
      slug,
      entry_type = 'artwork',
      parent_project_id = null,
      description = '',
      year = '',
      technique = '',
      dimensions = '',
      location = '',
      price_label = '',
      status = 'none',
      allow_inquiry = true,
      is_published = true,
    } = req.body || {};

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Titel krävs.' });
    }

    const safeType = ['artwork', 'project'].includes(entry_type) ? entry_type : 'artwork';
    const safeStatus = ['available', 'sold', 'exhibited', 'none'].includes(status) ? status : 'none';
    const uniqueSlug = await ensureUniqueSlug('art_entries', slug || title, id);
    const parentId =
      safeType === 'artwork' && parent_project_id && Number(parent_project_id) !== id
        ? Number(parent_project_id)
        : null;

    const updated = await query(
      `UPDATE art_entries
       SET slug = $1, title = $2, entry_type = $3, parent_project_id = $4, description = $5,
           year = $6, technique = $7, dimensions = $8, location = $9, price_label = $10,
           status = $11, allow_inquiry = $12, is_published = $13
       WHERE id = $14
       RETURNING *`,
      [
        uniqueSlug,
        String(title).trim(),
        safeType,
        parentId,
        String(description || ''),
        String(year || '').trim(),
        String(technique || '').trim(),
        String(dimensions || '').trim(),
        String(location || '').trim(),
        String(price_label || '').trim(),
        safeStatus,
        Boolean(allow_inquiry),
        Boolean(is_published),
        id,
      ]
    );

    if (!updated.rows[0]) {
      return res.status(404).json({ error: 'Konstposten hittades inte.' });
    }
    const [item] = await attachMedia('art', updated.rows);
    return res.json({ item });
  } catch (err) {
    console.error('Fel i PUT /api/admin/art/:id:', err.message);
    return res.status(500).json({ error: 'Kunde inte uppdatera konstpost.' });
  }
});

router.delete('/art/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const mediaRes = await query(
      "SELECT url_large, url_thumb FROM media WHERE entity_type = 'art' AND entity_id = $1",
      [id]
    );
    await query("DELETE FROM media WHERE entity_type = 'art' AND entity_id = $1", [id]);
    const delRes = await query('DELETE FROM art_entries WHERE id = $1 RETURNING id', [id]);
    if (!delRes.rows[0]) {
      return res.status(404).json({ error: 'Konstposten hittades inte.' });
    }
    for (const m of mediaRes.rows) {
      await deleteFileByUrl(m.url_large);
      await deleteFileByUrl(m.url_thumb);
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('Fel i DELETE /api/admin/art/:id:', err.message);
    return res.status(500).json({ error: 'Kunde inte ta bort konstpost.' });
  }
});

// ============================================================
// MEDIA / BILDUPPLADDNING (optimeras automatiskt via sharp)
// ============================================================
router.post('/media/upload', upload.array('files', 10), async (req, res) => {
  try {
    const { entity_type, entity_id } = req.body || {};
    if (!['jewelry', 'art'].includes(entity_type) || !entity_id) {
      return res.status(400).json({ error: 'Ange giltig entity_type och entity_id.' });
    }
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ error: 'Ingen bildfil mottogs.' });
    }

    const eid = Number(entity_id);
    const existingRes = await query(
      'SELECT COUNT(*)::int AS count, COALESCE(MAX(sort_order), -1)::int AS max_order FROM media WHERE entity_type = $1 AND entity_id = $2',
      [entity_type, eid]
    );
    let nextOrder = existingRes.rows[0].max_order + 1;
    let hasPrimary = existingRes.rows[0].count > 0;

    const created = [];
    for (const file of files) {
      const processed = await processAndSaveImage(file.buffer, `${entity_type}-${eid}`);
      const ins = await query(
        `INSERT INTO media (entity_type, entity_id, url_large, url_thumb, width, height, sort_order, is_primary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          entity_type,
          eid,
          processed.urlLarge,
          processed.urlThumb,
          processed.width,
          processed.height,
          nextOrder,
          !hasPrimary,
        ]
      );
      created.push(ins.rows[0]);
      nextOrder += 1;
      hasPrimary = true;
    }

    return res.status(201).json({ media: created });
  } catch (err) {
    console.error('Fel vid bilduppladdning:', err.message);
    return res.status(500).json({ error: err.message || 'Kunde inte ladda upp bild.' });
  }
});

// Ladda upp bakgrunds- eller hero-bild för sajten (Utseende & Layout)
router.post('/media/site-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Ingen bildfil mottogs.' });
    }
    const processed = await processAndSaveImage(req.file.buffer, 'site-bg');
    await query(
      `INSERT INTO media (entity_type, entity_id, url_large, url_thumb, width, height)
       VALUES ('site', NULL, $1, $2, $3, $4)`,
      [processed.urlLarge, processed.urlThumb, processed.width, processed.height]
    );
    return res.status(201).json(processed);
  } catch (err) {
    console.error('Fel vid uppladdning av bakgrundsbild:', err.message);
    return res.status(500).json({ error: 'Kunde inte ladda upp bakgrundsbild.' });
  }
});

router.put('/media/reorder', async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'Ogiltig lista.' });
    }
    for (let i = 0; i < ids.length; i += 1) {
      await query('UPDATE media SET sort_order = $1 WHERE id = $2', [i, Number(ids[i])]);
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('Fel vid bildsortering:', err.message);
    return res.status(500).json({ error: 'Kunde inte spara bildordning.' });
  }
});

router.put('/media/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { alt_text, caption, is_primary } = req.body || {};

    const cur = await query('SELECT * FROM media WHERE id = $1', [id]);
    if (!cur.rows[0]) {
      return res.status(404).json({ error: 'Bilden hittades inte.' });
    }
    const row = cur.rows[0];

    if (is_primary === true && row.entity_id) {
      await query(
        'UPDATE media SET is_primary = FALSE WHERE entity_type = $1 AND entity_id = $2',
        [row.entity_type, row.entity_id]
      );
    }

    const updated = await query(
      `UPDATE media
       SET alt_text = COALESCE($1, alt_text),
           caption = COALESCE($2, caption),
           is_primary = COALESCE($3, is_primary)
       WHERE id = $4
       RETURNING *`,
      [
        alt_text !== undefined ? String(alt_text) : null,
        caption !== undefined ? String(caption) : null,
        is_primary !== undefined ? Boolean(is_primary) : null,
        id,
      ]
    );
    return res.json({ media: updated.rows[0] });
  } catch (err) {
    console.error('Fel i PUT /api/admin/media/:id:', err.message);
    return res.status(500).json({ error: 'Kunde inte uppdatera bild.' });
  }
});

router.delete('/media/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await query('DELETE FROM media WHERE id = $1 RETURNING *', [id]);
    if (!deleted.rows[0]) {
      return res.status(404).json({ error: 'Bilden hittades inte.' });
    }
    const row = deleted.rows[0];
    await deleteFileByUrl(row.url_large);
    await deleteFileByUrl(row.url_thumb);

    // Om borttagen bild var omslagsbild, gör nästa bild till ny omslagsbild
    if (row.is_primary && row.entity_id) {
      await query(
        `UPDATE media SET is_primary = TRUE
         WHERE id = (
           SELECT id FROM media WHERE entity_type = $1 AND entity_id = $2
           ORDER BY sort_order ASC, id ASC LIMIT 1
         )`,
        [row.entity_type, row.entity_id]
      );
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('Fel i DELETE /api/admin/media/:id:', err.message);
    return res.status(500).json({ error: 'Kunde inte ta bort bild.' });
  }
});

// ============================================================
// SIDOR & TEXTER
// ============================================================
router.get('/pages', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM pages ORDER BY slug ASC');
    return res.json({ pages: result.rows });
  } catch (err) {
    console.error('Fel i GET /api/admin/pages:', err.message);
    return res.status(500).json({ error: 'Kunde inte hämta sidor.' });
  }
});

router.put('/pages/:slug', async (req, res) => {
  try {
    const slug = slugify(req.params.slug);
    const { title = '', content = '' } = req.body || {};
    if (!String(title).trim()) {
      return res.status(400).json({ error: 'Sidtitel krävs.' });
    }
    const result = await query(
      `INSERT INTO pages (slug, title, content)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET title = $2, content = $3
       RETURNING *`,
      [slug, String(title).trim(), String(content || '')]
    );
    return res.json({ page: result.rows[0] });
  } catch (err) {
    console.error('Fel i PUT /api/admin/pages/:slug:', err.message);
    return res.status(500).json({ error: 'Kunde inte spara sida.' });
  }
});

// ============================================================
// INSTÄLLNINGAR (UTSEENDE, LAYOUT & KONTAKT)
// ============================================================
router.get('/settings', async (_req, res) => {
  try {
    const result = await query('SELECT key, value FROM site_settings');
    const settings = {
      theme: { ...DEFAULT_SETTINGS.theme },
      layout: { ...DEFAULT_SETTINGS.layout },
      contact: { ...DEFAULT_SETTINGS.contact },
    };
    for (const row of result.rows) {
      settings[row.key] = { ...(settings[row.key] || {}), ...(row.value || {}) };
    }
    return res.json({ settings });
  } catch (err) {
    console.error('Fel i GET /api/admin/settings:', err.message);
    return res.status(500).json({ error: 'Kunde inte hämta inställningar.' });
  }
});

router.put('/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    if (!['theme', 'layout', 'contact'].includes(key)) {
      return res.status(400).json({ error: 'Ogiltig inställningsnyckel.' });
    }
    const value = req.body || {};
    const result = await query(
      `INSERT INTO site_settings (key, value)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = $2::jsonb
       RETURNING *`,
      [key, JSON.stringify(value)]
    );
    return res.json({ key: result.rows[0].key, value: result.rows[0].value });
  } catch (err) {
    console.error('Fel i PUT /api/admin/settings/:key:', err.message);
    return res.status(500).json({ error: 'Kunde inte spara inställningar.' });
  }
});

router.post('/settings/reset', async (req, res) => {
  try {
    const keys = Array.isArray(req.body?.keys)
      ? req.body.keys.filter((k) => ['theme', 'layout'].includes(k))
      : ['theme', 'layout'];

    for (const key of keys) {
      // Behåll uppladdad standard-hero om den redan satts vid import om man bara återställer färger/layout
      await query(
        `INSERT INTO site_settings (key, value)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = $2::jsonb`,
        [key, JSON.stringify(DEFAULT_SETTINGS[key])]
      );
    }
    return res.json({ ok: true, resetKeys: keys, defaults: DEFAULT_SETTINGS });
  } catch (err) {
    console.error('Fel vid återställning av inställningar:', err.message);
    return res.status(500).json({ error: 'Kunde inte återställa inställningar.' });
  }
});

// ============================================================
// FÖRFRÅGNINGAR (INKORG)
// ============================================================
router.get('/inquiries', async (req, res) => {
  try {
    const { status } = req.query;
    const params = [];
    let sql = 'SELECT * FROM inquiries';
    if (status && ['new', 'handled', 'archived'].includes(String(status))) {
      params.push(String(status));
      sql += ' WHERE status = $1';
    }
    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    return res.json({ inquiries: result.rows });
  } catch (err) {
    console.error('Fel i GET /api/admin/inquiries:', err.message);
    return res.status(500).json({ error: 'Kunde inte hämta förfrågningar.' });
  }
});

router.put('/inquiries/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, admin_notes } = req.body || {};
    const safeStatus =
      status && ['new', 'handled', 'archived'].includes(status) ? status : null;

    const result = await query(
      `UPDATE inquiries
       SET status = COALESCE($1, status),
           admin_notes = COALESCE($2, admin_notes)
       WHERE id = $3
       RETURNING *`,
      [safeStatus, admin_notes !== undefined ? String(admin_notes) : null, id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Förfrågan hittades inte.' });
    }
    return res.json({ inquiry: result.rows[0] });
  } catch (err) {
    console.error('Fel i PUT /api/admin/inquiries/:id:', err.message);
    return res.status(500).json({ error: 'Kunde inte uppdatera förfrågan.' });
  }
});

router.delete('/inquiries/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const del = await query('DELETE FROM inquiries WHERE id = $1 RETURNING id', [id]);
    if (!del.rows[0]) {
      return res.status(404).json({ error: 'Förfrågan hittades inte.' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('Fel i DELETE /api/admin/inquiries/:id:', err.message);
    return res.status(500).json({ error: 'Kunde inte ta bort förfrågan.' });
  }
});

// ============================================================
// ADMINISTRATÖRER (GOOGLE-VITLISTA)
// ============================================================
router.get('/users', async (_req, res) => {
  try {
    const result = await query('SELECT id, email, name, added_by, created_at FROM admin_users ORDER BY id ASC');
    return res.json({
      users: result.rows,
      initialAdminEmail: getInitialAdminEmail(),
    });
  } catch (err) {
    console.error('Fel i GET /api/admin/users:', err.message);
    return res.status(500).json({ error: 'Kunde inte hämta administratörer.' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const name = String(req.body?.name || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Ange en giltig Google-e-postadress.' });
    }
    const result = await query(
      `INSERT INTO admin_users (email, name, added_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET name = COALESCE(NULLIF($2, ''), admin_users.name)
       RETURNING id, email, name, added_by, created_at`,
      [email, name, req.admin.email]
    );
    return res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error('Fel i POST /api/admin/users:', err.message);
    return res.status(500).json({ error: 'Kunde inte lägga till administratör.' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const targetRes = await query('SELECT id, email FROM admin_users WHERE id = $1', [id]);
    if (!targetRes.rows[0]) {
      return res.status(404).json({ error: 'Administratören hittades inte.' });
    }

    const targetEmail = targetRes.rows[0].email.toLowerCase();
    if (targetEmail === req.admin.email.toLowerCase()) {
      return res.status(400).json({ error: 'Du kan inte ta bort dig själv som administratör.' });
    }
    if (targetEmail === getInitialAdminEmail()) {
      return res.status(400).json({ error: 'Grund-administratören (.env) kan inte tas bort här.' });
    }

    const countRes = await query('SELECT COUNT(*)::int AS count FROM admin_users');
    if (countRes.rows[0].count <= 1) {
      return res.status(400).json({ error: 'Minst en administratör måste finnas kvar.' });
    }

    await query('DELETE FROM admin_users WHERE id = $1', [id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Fel i DELETE /api/admin/users/:id:', err.message);
    return res.status(500).json({ error: 'Kunde inte ta bort administratör.' });
  }
});

// Snygg felhantering för multer-fel (t.ex. för stor fil eller fel filtyp)
router.use((err, _req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message || 'Fel vid filuppladdning.' });
  }
  return next();
});

export default router;

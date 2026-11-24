import fs from 'fs';
import path from 'path';
import { query } from '../db/index.js';

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildMetaTags({ title, description, image, url }) {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const lines = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Anna-Lea" />`,
    `<meta property="og:title" content="${safeTitle}" />`,
    `<meta property="og:description" content="${safeDesc}" />`,
  ];
  if (url) lines.push(`<meta property="og:url" content="${escapeHtml(url)}" />`);
  if (image) lines.push(`<meta property="og:image" content="${escapeHtml(image)}" />`);
  lines.push(`<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`);
  return lines.join('\n    ');
}

export async function renderSpaWithSeo(req, res, publicDir) {
  const indexPath = path.join(publicDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return res.status(404).send('Frontend är inte byggd ännu. Kör npm run build.');
  }

  let html = fs.readFileSync(indexPath, 'utf8');
  let title = 'Anna-Lea | Smycken & Konst';
  let description = 'Handgjorda smycken och konst av Anna-Lea Öquist i Stockholm.';
  let image = '';

  const baseUrl = (process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

  try {
    const cleanPath = req.path.replace(/\/+$/, '') || '/';

    if (cleanPath.startsWith('/smycken/')) {
      const slug = cleanPath.replace('/smycken/', '').split('/')[0];
      const itemRes = await query(
        `SELECT j.title, j.description, m.url_large
         FROM jewelry_items j
         LEFT JOIN LATERAL (
           SELECT url_large FROM media
           WHERE entity_type = 'jewelry' AND entity_id = j.id
           ORDER BY is_primary DESC, sort_order ASC, id ASC
           LIMIT 1
         ) m ON TRUE
         WHERE j.slug = $1 AND j.is_published = TRUE`,
        [slug]
      );
      if (itemRes.rows[0]) {
        const item = itemRes.rows[0];
        title = `${item.title} | Anna-Lea`;
        if (item.description) description = item.description.slice(0, 160);
        if (item.url_large) image = `${baseUrl}${item.url_large}`;
      }
    } else if (cleanPath.startsWith('/konst/')) {
      const slug = cleanPath.replace('/konst/', '').split('/')[0];
      const artRes = await query(
        `SELECT a.title, a.description, m.url_large
         FROM art_entries a
         LEFT JOIN LATERAL (
           SELECT url_large FROM media
           WHERE entity_type = 'art' AND entity_id = a.id
           ORDER BY is_primary DESC, sort_order ASC, id ASC
           LIMIT 1
         ) m ON TRUE
         WHERE a.slug = $1 AND a.is_published = TRUE`,
        [slug]
      );
      if (artRes.rows[0]) {
        const art = artRes.rows[0];
        title = `${art.title} | Konst – Anna-Lea`;
        if (art.description) description = art.description.slice(0, 160);
        if (art.url_large) image = `${baseUrl}${art.url_large}`;
      }
    } else if (cleanPath === '/smycken') {
      title = 'Smycken | Anna-Lea';
      description = 'Handgjorda smycken i återvunnet silver, massivt guld och etiska ädelstenar.';
    } else if (cleanPath === '/konst') {
      title = 'Konst | Anna-Lea';
      description = 'Konstverk, serier och projekt av Anna-Lea Öquist.';
    }
  } catch {
    // Fallback till standard-metadata om databasen ej är nåbar
  }

  const metaTags = buildMetaTags({
    title,
    description,
    image,
    url: `${baseUrl}${req.originalUrl}`,
  });

  html = html
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta name="description" content=".*?" \/>/,
      `<meta name="description" content="${escapeHtml(description)}" />`
    )
    .replace('<!-- OG_META_PLACEHOLDER -->', metaTags);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
}

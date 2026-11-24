-- ==========================================================
-- Nya anna-lea.com – PostgreSQL Databasschema
-- Idempotent: kan köras säkert flera gånger
-- ==========================================================

-- Gemensam funktion för automatisk updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Administratörer (Google OAuth vitlista)
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT DEFAULT '',
  added_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Smycken & Unika beställningar
CREATE TABLE IF NOT EXISTS jewelry_items (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'smycken' CHECK (category IN ('smycken', 'unika_bestallningar')),
  price_label TEXT DEFAULT '',
  variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT DEFAULT '',
  story TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'on_request')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jewelry_category_order ON jewelry_items (category, sort_order, id);

DROP TRIGGER IF EXISTS trg_jewelry_updated_at ON jewelry_items;
CREATE TRIGGER trg_jewelry_updated_at
  BEFORE UPDATE ON jewelry_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Konstverk & Konstprojekt / Utställningar
CREATE TABLE IF NOT EXISTS art_entries (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'artwork' CHECK (entry_type IN ('artwork', 'project')),
  parent_project_id INTEGER REFERENCES art_entries(id) ON DELETE SET NULL,
  description TEXT DEFAULT '',
  year TEXT DEFAULT '',
  technique TEXT DEFAULT '',
  dimensions TEXT DEFAULT '',
  location TEXT DEFAULT '',
  price_label TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'none' CHECK (status IN ('available', 'sold', 'exhibited', 'none')),
  allow_inquiry BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_art_type_order ON art_entries (entry_type, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_art_parent ON art_entries (parent_project_id);

DROP TRIGGER IF EXISTS trg_art_updated_at ON art_entries;
CREATE TRIGGER trg_art_updated_at
  BEFORE UPDATE ON art_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Media / Bilder (optimerade WebP-filer för smycken, konst och sajtbakgrunder)
CREATE TABLE IF NOT EXISTS media (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('jewelry', 'art', 'site')),
  entity_id INTEGER,
  url_large TEXT NOT NULL,
  url_thumb TEXT NOT NULL,
  alt_text TEXT DEFAULT '',
  caption TEXT DEFAULT '',
  width INTEGER,
  height INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_entity ON media (entity_type, entity_id, sort_order, id);

-- 5. Redigerbara texter & informationssidor
CREATE TABLE IF NOT EXISTS pages (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_pages_updated_at ON pages;
CREATE TRIGGER trg_pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. Webbplatsinställningar (Utseende, Layout & Kontaktinfo)
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON site_settings;
CREATE TRIGGER trg_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 7. Inkomna beställningar & förfrågningar (admin-inkorg)
CREATE TABLE IF NOT EXISTS inquiries (
  id SERIAL PRIMARY KEY,
  inquiry_type TEXT NOT NULL DEFAULT 'contact' CHECK (inquiry_type IN ('jewelry_order', 'custom_request', 'art_inquiry', 'contact')),
  entity_type TEXT DEFAULT '',
  entity_id INTEGER,
  item_title TEXT DEFAULT '',
  variant_choice TEXT DEFAULT '',
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  message TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'handled', 'archived')),
  admin_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_status_created ON inquiries (status, created_at DESC);

-- Standardinställningar (infogas endast om nyckeln saknas)
INSERT INTO site_settings (key, value) VALUES
('theme', '{
  "bgPrimary": "#ffffff",
  "bgSecondary": "#faf9f7",
  "textPrimary": "#2f2e2e",
  "textMuted": "#605e5e",
  "accent": "#8c6d5a",
  "fontHeading": "jost",
  "fontBody": "jost",
  "heroImageUrl": "",
  "heroOverlayOpacity": 0.25,
  "jewelryBgUrl": "",
  "artBgUrl": ""
}'::jsonb),
('layout', '{
  "homeMode": "split",
  "homeTitle": "Anna-Lea Öquist",
  "homeSubtitle": "Handgjorda smycken och konst från ateljén på Södermalm i Stockholm.",
  "homeIntro": "Smycken tillverkade med reflektion och omtanke i återvunnet silver, guld och etiska ädelstenar — samt konstverk och utställningsprojekt.",
  "jewelryCardTitle": "Smycken",
  "jewelryCardSubtitle": "Handgjorda smycken & unika vigselringar",
  "artCardTitle": "Konst",
  "artCardSubtitle": "Konstverk, serier & projekt",
  "homeSections": [
    { "id": "hero", "label": "Stämningsbild & välkomsttext", "visible": true },
    { "id": "portals", "label": "Ingångar till Smycken & Konst", "visible": true },
    { "id": "about", "label": "Kort presentation av Anna-Lea", "visible": true }
  ],
  "galleryColumnsDesktop": 3,
  "showArtLink": true,
  "showJewelryLink": true
}'::jsonb),
('contact', '{
  "email": "annalea.oquist@gmail.com",
  "phone": "+46 73 076 35 15",
  "studioTitle": "Ateljé",
  "addressLine1": "Högbergsgatan 12",
  "addressLine2": "116 20 Södermalm, Stockholm",
  "instagramUrl": "https://www.instagram.com/",
  "copyright": "© Anna-Lea AB"
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

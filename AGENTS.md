# Projektregler & Kontext – anna-lea.com

Dessa regler gäller **alltid** i varje konversation för detta projekt.

---

## 1. Arbetssätt & Kommunikation (Krav)

- **Språk:** Kommunicera alltid på **svenska** (både i chatt, UI-texter och dokumentation).
- **Frågor = bara svar:** Om användaren ställer en fråga ska du **endast svara** — ändra inga filer och kör inga ändrande kommandon.
- **Berätta alltid först:** Förklara alltid tydligt vad du tänker göra **innan** du gör ändringar, så att användaren hinner kommentera eller ändra riktning.
- **Enkelt, robust & snabbt:** Håll lösningar enkla, lättunderhållna och prestandamedvetna (optimera bilder, håll bundle-storlekar små, undvik onödiga beroenden).
- **Proaktiv med respekt:** Föreslå gärna förbättringar i kod, säkerhet och UX, men fråga alltid innan större förändringar.

---

## 2. Projektöversikt & Arkitektur

- **Syfte:** Ny egenägd version av **anna-lea.com** (Anna-Lea Öquists **Smycken** och **Konst**), med samma avskalade, ljusa och varma känsla som originalet.
- **Teknikstack:**
  - **Frontend (`client/`):** React 19 + Vite 6 + Tailwind CSS 3 + React Router 7 + Lucide-ikoner. Admingränssnittet (`/admin`) lazy-laddas via `React.lazy`.
  - **Backend (`server/`):** Node.js 20 (ESM) + Express 4 + `pg` + `sharp` (auto-EXIF-rotation + WebP i 2 storlekar: `thumb` 640 px och `large` 1800 px) + `multer` v2 + `helmet` + `express-rate-limit` + server-side SEO/Open Graph-injektion.
  - **Databas:** PostgreSQL 15 (`anna-lea-db`, port `5440` på ZBook `192.168.0.121`) med både **`annalea_prod`** och **`annalea_dev`**. Schema i `server/db/schema.sql` (7 tabeller).
  - **Autentisering (`/admin`):** Ren **Google OAuth 2.0** (`google-auth-library` + HTTP-only JWT-cookie `anna_lea_auth`), utan `prompt: 'select_account'` för direkt inloggning. Grund-admin: `aengst@gmail.com` (`INITIAL_ADMIN_EMAIL`); fler admins hanteras i `/admin → Admins`.
  - **Utseende utan kod:** Bakgrundsbilder, färger, typsnitt, startsideläge (`split` / `jewelry` / `art`), sektionsordning och gallerikolumner styrs via `site_settings` och CSS-variabler i `/admin → Utseende`.
  - **Adminmanual i appen:** `docs/ADMIN_MANUAL.md` läses in direkt i `/admin → Manual` (en enda källa till sanning).

---

## 3. Portar, Drift & Releasehantering

- **Portar (krockfria med Fiskeloggen, Fågelloggen, City-Packman & City-History):**
  - App / API (prod & lokal dev): **`3004`**
  - Vite dev-server: **`5176`** (`npm run dev:all`)
  - PostgreSQL (`anna-lea-db`): **`5440`**
- **Drift på ZBook (`192.168.0.121`):**
  - **Portainer Stack (`anna-lea`):** Byggs direkt från GitHub (`https://github.com/aengst/anna-lea`, branch `main`) med `docker-compose.yml` (2 containrar: `anna-lea` och `anna-lea-db`).
  - **Persistenta volymer på ZBook:** `/home/anders/srv/anna-lea/db` och `/home/anders/srv/anna-lea/uploads`.
  - **Cloudflare Tunnel:** Återanvänder den befintliga gemensamma tunneln **`zbook_server`** (`https://anna-lea.minaloggar.se` → `http://192.168.0.121:3004`). Senare byts domänen till `anna-lea.com` enbart via Cloudflare, Google OAuth och miljövariabler i Portainer.
  - **Molnflytt:** Appen är helt Docker/Postgres-standardiserad och filhanteringen är inkapslad i `server/services/storage.js`.
- **Releasehantering:**
  - Rotens `package.json` är enda *Source of Truth* för versionsnummer (visas i `/admin`, publika sidfoten och `GET /api/health`).
  - Använd skillen `release-assistant` och `scripts/release.js` (`node scripts/release.js <patch|minor|major> "titel" "body"`).
  - **Viktigt:** Versionsnumret (`vX.Y.Z`) ska alltid stå **först** i release-commitens rubrik (t.ex. `v0.2.0 feat(admin): ...`) så det syns direkt i GitHub-översikten.
  - Vid Portainer-uppdatering: **Pull and redeploy** med reglaget **"Re-pull image and redeploy"** påslaget.

---

## 4. Viktiga dokument i repot

- `docs/DESIGN.md` – Visuellt och tekniskt designdokument
- `docs/ADMIN_MANUAL.md` – Användarmanual (visas även direkt i `/admin → Manual`)
- `docs/DEPLOYMENT.md` – Driftsättning på ZBook och molnflytt
- `docs/PORTAINER_VERSIONING_GUIDE.md` – Versions- och releaseguide
- `_arkiv/` – Ursprungliga anna-lea.com-arkivet (exkluderat i `.gitignore`, sparat lokalt/OneDrive)

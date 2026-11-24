# Teknisk plan – Nya anna-lea.com

Denna plan sammanfattar arkitektur, design, datamodell, admingränssnitt, drift och etapper för den nya versionen av **anna-lea.com**, baserat på [anna-lea.com krav.txt](file:///c:/Users/Windows/OneDrive/Dokument/AI%20Projekt/anna-lea/anna-lea.com%20krav.txt) och besluten i [planeringsfragor.md](file:///c:/Users/Windows/OneDrive/Dokument/AI%20Projekt/anna-lea/planeringsfragor.md).

---

## 1. Mål & ledstjärnor

- **Samma känsla i färg och form:** Bevara den avskalade, ljusa, konstnärliga och varma estetiken från gamla anna-lea.com.
- **Två jämbördiga världar:** En del för **Smycken** (inkl. *Unika beställningar / Vigselringar*) och en del för **Konst** (både enskilda verk och projekt/serier).
- **Enkelt att sköta utan kod:** Mobilanpassat admingränssnitt för innehåll, förfrågningar, administratörer samt **utseende & layout** (bakgrunder, färger, sidindelning).
- **Enkelt, robust & snabbt:** Avskalad version av samma teknikstack som dina övriga ZBook-appar, med automatisk bildoptimering och god SEO/delningsförhandsvisning.
- **ZBook först, lätt att flytta till molnet:** Standardiserad Docker + PostgreSQL + utbytbar bildlagring.

---

## 2. Visuell profil & designkänsla

Utifrån analys av det arkiverade materialet ([hem.html](file:///c:/Users/Windows/OneDrive/Dokument/AI%20Projekt/anna-lea/sidor_html/hem.html) och originalbilderna):

- **Färgpalett (standardtema, ändringsbart i admin):**
  - Bakgrund: Vit (`#FFFFFF`) och mjuk ljus yta (`#FAF9F7`)
  - Primär text: Kolgrå/svart (`#2F2E2E` / `#1A1A1A`), sekundär text (`#605E5E`)
  - Stämningsfull signaturbakgrund: Varmt ljusspel/prismor (`hud_02.jpg`) i hero/avdelare (utbytbar i admin)
  - Logotyp & favicon: Den cirkulära grötdocka-silhuetten (`site_logo_favicon.png`)
- **Typografi:** Tunna, luftiga och tidlösa geometriska sans-serifer (t.ex. *Jost* / *Raleway* som fria motsvarigheter till Wix kommersiella *Futura Light* / *DIN Next Light*), kombinerat med diskret serif-alternativ vid önskemål — valbart i admin.
- **Galleri & läsbarhet:** Generöst med luft runt frilagda smyckesfoton och konstverk, mjuk bildväxling och helskärms-lightbox på detaljsidor.

---

## 3. Sidstruktur & rutter

### Publika sidor
| Rutt | Innehåll |
| :--- | :--- |
| `/` | **Startsida** – Som standard gemensam landningssida med Anna-Leas uttryck, kort presentation och tydliga ingångar till **Smycken** och **Konst** *(kan växlas i admin till att öppna Smycken eller Konst direkt)*. |
| `/smycken` | Smyckesgalleri + sektionen **Unika beställningar / Vigselringar** + *"Min syn på smycken"*. |
| `/smycken/:slug` | Detaljsida för smycke/ring: bildgalleri + lightbox, pris/varianter, beskrivning/berättelse samt enkelt **beställnings-/förfrågningsformulär**. |
| `/konst` | Konstgalleri med stöd för både **enskilda verk** och **projekt/serier** + *"Om konsten"*. |
| `/konst/:slug` | Detaljsida för konstverk eller projekt: bildserie + lightbox, valfri metadata (år, teknik, mått, utställning/plats, pris, status) samt **intresseförfrågan**. |
| `/info/:slug` | Redigerbara informationssidor: *Beställning & storlek*, *Returer*, *Allmänna villkor*. |
| `/kontakt` | Kontaktuppgifter, ateljéadress (Högbergsgatan 12, Södermalm), Instagram-länk samt allmänt kontaktformulär. |

### Admingränssnitt
| Rutt | Innehåll |
| :--- | :--- |
| `/admin` | Skyddat bakom **Google-inloggning** (vitlistade e-postadresser). Mobilanpassat med 6 flikar (se avsnitt 6). |

---

## 4. Teknikstack & arkitektur

Återanvänder samma välkända grund som `fagelloggen`, `fishing-log`, `city-packman` och `city-history-map`, men utan tungt extra-bagage:

- **Frontend:** React 19 + Vite + Tailwind CSS + React Router + Lucide-ikoner.
- **Backend:** Node.js 20 + Express (ESM) i samma container:
  - Serverar både `/api/*`, uppladdad media `/uploads/*` och byggd frontend.
  - **SEO & länkdelning:** Enkel server-side injektion av `<title>`, `<meta description>` och Open Graph-taggar (`og:title`, `og:image`, `og:description`) i `index.html` för varje smycke/konstverk så delning på Instagram/SMS och Google-indexering fungerar bra.
  - **Säkerhet:** `helmet`, `cors`, `cookie-parser`, `express-rate-limit` samt osynligt honeypot-fält på publika formulär (spamskydd utan CAPTCHA).
  - **Autentisering:** `google-auth-library` + HTTP-only JWT-cookie (`jsonwebtoken`), precis som i dina övriga appar.
- **Bildoptimering:** `multer` (uppladdning) + `sharp` som automatiskt:
  - Roterar efter EXIF (viktigt för mobilfoton!),
  - Genererar två snabba **WebP**-versioner: `thumb` (~600 px bred, ~30–60 KB) för gallerier och `large` (~1800 px bred, ~100–250 KB) för detaljvy/lightbox.
  - Lång cache-header (`Cache-Control: public, max-age=31536000, immutable`) med unika filnamn.
  - Lagringslogiken samlas i `server/services/storage.js` så att lokal disk enkelt kan bytas mot S3 / Cloudflare R2 vid framtida molnflytt.
- **Databas:** PostgreSQL 15 (`pg` direkt utan tung ORM).

---

## 5. Datamodell (PostgreSQL)

Sex rena och lättöverskådliga tabeller:

1. **`admin_users`** – Vitlistade Google-konton som har åtkomst till `/admin` (`id`, `email` unik, `name`, `added_by`, `created_at`). Grund-admin anges dessutom i `.env` (`INITIAL_ADMIN_EMAIL`) så man aldrig kan låsa sig ute.
2. **`jewelry_items`** – Smycken och unika beställningar:
   - `id`, `slug` (unik), `title`, `category` (`'smycken'` | `'unika_bestallningar'`)
   - `price_label` (t.ex. `"2 300 kr"`), `variants` (`JSONB`, t.ex. `[{"label":"Små","price":"1 600 kr"},{"label":"Stora","price":"2 000 kr"}]`)
   - `description`, `story` (t.ex. berättelsen om grötdockan), `status` (`'available'` | `'sold'` | `'on_request'`)
   - `sort_order`, `is_published`, `created_at`, `updated_at`
3. **`art_entries`** – Både enskilda konstverk och konstprojekt/utställningar:
   - `id`, `slug` (unik), `title`, `entry_type` (`'artwork'` | `'project'`)
   - `parent_project_id` (valfri FK till `art_entries.id` så enskilda verk kan kopplas till ett projekt om man vill)
   - `description`, `year`, `technique`, `dimensions`, `location`, `price_label`
   - `status` (`'available'` | `'sold'` | `'exhibited'` | `'none'`)
   - `allow_inquiry` (boolean), `sort_order`, `is_published`, `created_at`, `updated_at`
4. **`media`** – Alla bilder kopplade till smycken, konst eller sajten:
   - `id`, `entity_type` (`'jewelry'` | `'art'` | `'site'`), `entity_id` (nullable för sajt-bilder)
   - `url_large`, `url_thumb`, `alt_text`, `caption`, `width`, `height`
   - `sort_order`, `is_primary`, `created_at`
5. **`pages`** – Redigerbara texter och informationssidor:
   - `slug` (PK, t.ex. `min-syn-pa-smycken`, `om-konsten`, `bestallning-och-storlek`, `returer`, `allmanna-villkor`), `title`, `content`, `updated_at`
6. **`site_settings`** – Utseende, layout och kontaktinfo (nyckel → `JSONB`):
   - `theme`: färger (bakgrund, text, sekundär yta, accent), typsnittsval, hero-bakgrundsbilder & overlay-styrka
   - `layout`: startsideläge (`'split'` | `'jewelry'` | `'art'`), sektionsordning & synlighet på startsidan, antal gallerikolumner (mobil/desktop), synliga menyval
   - `contact`: e-post, telefon, ateljéadress, Instagram-URL, sidfotstext
7. **`inquiries`** – Inkomna beställningar och förfrågningar:
   - `id`, `inquiry_type` (`'jewelry_order'` | `'custom_request'` | `'art_inquiry'` | `'contact'`)
   - `entity_type`, `entity_id`, `item_title`, `variant_choice`
   - `customer_name`, `customer_email`, `customer_phone`, `message`
   - `status` (`'new'` | `'handled'` | `'archived'`), `admin_notes`, `created_at`

*(Totalt 7 små, kristallklara tabeller — lätt att förstå och felsöka i DBeaver.)*

---

## 6. Admingränssnitt (`/admin`) – Mobilanpassat

Byggs med stora, lättklickade knappar, direkt bilduppladdning från mobilens kamera/bibliotek och smidig navigation:

1. **Förfrågningar (Inkorg):** Lista på alla inkomna beställningar/förfrågningar, filter på *Nya / Hanterade / Arkiverade*, siffra för olästa, anteckningsfält för Anna-Lea.
2. **Smycken:** Skapa, redigera, dölj/publicera, ta bort, sortera ordning (upp/ner), hantera prisvarianter och flera bilder (välj omslagsbild, sortera, ta bort).
3. **Konst:** Skapa både enskilda verk och projekt/serier med alla valfria metadatafält (tomma fält döljs automatiskt publikt) + bildgalleri.
4. **Sidor & texter:** Enkel redigering av startsidans texter, *"Min syn på smycken"*, *"Om konsten"*, *"Beställning & storlek"*, *"Returer"*, *"Allmänna villkor"* samt kontakt/ateljé.
5. **Utseende & Layout:** Ändra helt utan programmering:
   - Startsidans läge (*Gemensam startsida*, *Smycken direkt* eller *Konst direkt*)
   - Visa/dölj och ändra ordning på sektioner på startsidan
   - Byta bakgrundsbilder (startsida, smycken, konst) + ljusstyrka/toning
   - Färgpalett (bakgrund, text, yta, accent) & val mellan kuraterade typsnitt
   - Gallerikolumner (t.ex. 2, 3 eller 4 kolumner på desktop)
   - Knapp för **"Återställ standardutseende"** så man alltid kan testa fritt
6. **Administratörer:** Lista nuvarande admins, lägg till ny admin via Google-e-post, ta bort admin (med skydd mot att ta bort sig själv eller sista admin).

---

## 7. Drift på ZBook, utveckling & molnflytt

Följer samma beprövade mönster som dina övriga appar:

### Portförslag (utan krock med Fågelloggen `3003/5434`, Packman `5000/5432`, City-History `5001/5438`)
- **App (prod & lokal backend):** `3004`
- **PostgreSQL (`anna-lea-db`):** `5440` (rymmer både `annalea_prod` och `annalea_dev`, precis som Fågelloggens unified DB)
- **Vite dev-server:** `5176` (proxar `/api` och `/uploads` till lokal Express på `3004`)

### Drift & verktyg
- **`docker-compose.yml`:** Tre containrar (`anna-lea`, `anna-lea-db`, `anna-lea-tunnel`) redo för **Portainer Stacks** med lokalt bygge från GitHub.
- **Persistent media & databas:** Konfigurerbara volymer med samma mönster som Fiskeloggen (`/home/anders/srv/anna-lea/uploads` och `/home/anders/srv/anna-lea/db` som standard på ZBook, överstyrbart via `.env` vid molnflytt).
- **Skript i `package.json`:** `npm run dev:all`, `npm run tunnel` (vandrande utvecklingstunnel med `cloudflared-config.yml`), `npm run release` (samma release-skript som i `fagelloggen`).
- **Molnflytt:** Eftersom appen är en standard Node/Docker-container + standard PostgreSQL + inkapslad `storage.js` kan den flyttas rakt av till t.ex. Railway, Render, Fly.io eller valfri VPS genom att sätta miljövariablerna (`DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`).

---

## 8. Projektstruktur & arkivering

När vi sätter igång flyttar vi först allt gammalt innehåll in i `_arkiv/` (läggs i `.gitignore` så inte 37 MB råa arkivbilder tynger ner Git-repot, men ligger kvar lokalt/på OneDrive):

```text
anna-lea/
├── _arkiv/                   # Gamla anna-lea.com (sidor_html, sidor_markdown, bilder, json)
├── client/                   # React + Vite + Tailwind (publik sida + /admin)
├── server/                   # Node + Express API, auth, sharp-bildhantering, SEO-injektion
│   ├── db/                   # schema.sql + migrations + engångs-importskript
│   ├── routes/               # public, admin, auth, media, inquiries
│   └── services/             # storage.js, imageProcessor.js
├── scripts/                  # release.js
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
├── anna-lea.com krav.txt
├── planeringsfragor.md
└── PLAN.md
```

---

## 9. Genomförandeplan i etapper

Vi tar arbetet stegvis och stämmer alltid av före och efter varje etapp:

- **Etapp 1 – Grundstruktur & arkivering:** Flytta gamla filer till `_arkiv/`, sätta upp projektstrukturen (`package.json`, `client/`, `server/`, `Dockerfile`, `docker-compose.yml`, `.env.example`, `.gitignore`) och PostgreSQL-schemat (`schema.sql`).
- **Etapp 2 – Backend API, bildoptimering & importskript:** Bygga Express-servern, `sharp`-bildhanteringen, Google OAuth-inloggning + admin-middleware samt köra engångsimporten av alla 20 smycken/ringar, texter och bilder från `_arkiv/`.
- **Etapp 3 – Publik webbplats:** Bygga den stilrena publika sidan (Startsida, Smycken + detaljvy + beställningsformulär, Konst + projekt/verk + intresseförfrågan, Infosidor, Kontakt) med dynamiskt tema/layout från `site_settings` och SEO/OG-taggar.
- **Etapp 4 – Mobilanpassat admingränssnitt (`/admin`):** Bygga alla 6 flikar (Förfrågningar, Smycken, Konst, Sidor & texter, Utseende & Layout, Administratörer) med smidig bilduppladdning och sortering.
- **Etapp 5 – Test, prestanda & ZBook-driftsättning:** Verifiera laddtider, mobilvy, bildstorlekar, säkerhet samt färdigställa Portainer/Cloudflare Tunnel-guide för drift på ZBook.

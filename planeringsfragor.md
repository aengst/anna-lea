# Planeringsfrågor – Nya anna-lea.com

Denna fil samlar de beslutspunkter vi går igenom i tur och ordning innan vi tar fram den slutgiltiga tekniska planen.

---

## 1. Befintlig teknikstack & Zbook-servern
**Status:** Beslutad

- Vilken teknikstack använder dina befintliga appar idag (t.ex. Next.js, Vite/React, Node/Express, Python/FastAPI)?
- Vilken **databas** kör du redan på Zbook-servern (t.ex. PostgreSQL, SQLite, MySQL)?
- Körs apparna i **Docker** eller direkt på värdsystemet?
- Hur sköter du **tunnelhantering** och domänpekning idag (t.ex. Cloudflare Tunnel)?
- Finns det någon befintlig app/mapp vi ska titta på för att återanvända mönster, databas eller tunnelkonfiguration?

**Beslut:**
- **Teknikstack:** Avskalad version av samma standard som befintliga appar (`fagelloggen`, `fishing-log`, `city-*`): **React + Vite + Tailwind CSS** i frontend, **Node.js + Express (ESM)** i backend (serverar både API och byggd frontend + SEO/Open Graph-metataggar) samt `sharp` för automatisk bildoptimering (WebP/thumbnails).
- **Databas:** **PostgreSQL** (`pg`), helt i linje med befintliga appar och enkel att flytta till molntjänst.
- **Drift & tunnel:** **Docker Compose via Portainer** på ZBook, **Cloudflare Tunnel** i prod, vandrande dev-tunnel (`npm run dev:all` + `npm run tunnel`) samt `npm run release`.
- **Media:** Uppladdade bilder lagras i persistent Docker-volym bakom en enkel lagringsmodul (lätt att byta till t.ex. Cloudflare R2/S3 vid molnflytt).

---

## 2. Struktur mellan Smycken och Konst
**Status:** Beslutad

- Hur ska startsidan fungera?
  - Gemensam startsida med tydlig ingång till både *Smycken* och *Konst* (och kort presentation av Anna-Lea), **eller**
  - *Smycken* som huvudsida (som tidigare) med *Konst* som jämbördig huvudflik i menyn?
- Hur ska **Konst-delen** vara uppbyggd?
  - Enskilda konstverk i ett galleri, projekt/utställningar med bildserier (likt påbörjade `project-01`), eller både och?
  - Vilken metadata behövs per konstverk (t.ex. titel, år, teknik/material, mått, beskrivning, ev. pris eller status tillgänglig/såld)?

**Beslut:**
- **Startsida:** Gemensam startsida med tydlig ingång till både **Smycken** och **Konst** samt en kort presentation av Anna-Lea.
- **Lätt att ändra struktur:** Rena, separata rutter (`/`, `/smycken`, `/konst`, osv.) och databaserade/konfigurerbara texter & sektioner så att startsidan och strukturen är superenkla att justera längre fram.
- **Konst-delen:** Stöd för **både enskilda verk och projekt/serier** (där ett projekt kan innehålla egen beskrivning och flera bilder/verk).
- **Metadata för konst (valfria fält som bara visas när de är ifyllda):** Titel, beskrivning, år, teknik/material, mått/storlek, plats/utställning, pris (valfritt), status (*Tillgänglig / Såld / Utställd*) samt möjlighet till intresseförfrågan.

---

## 3. Beställningar & förfrågningar
**Status:** Beslutad

- Ska vi behålla samma enkla och robusta upplägg som tidigare med **beställnings-/förfrågningsformulär** per smycke (postförskott / förfrågan för unika ringar) som skickar e-postnotis till Anna-Lea (och gärna sparas i en översikt i admin)?
- Eller finns det önskemål om varukorg / direktbetalning (t.ex. Swish eller Stripe) nu eller förberett för framtiden?

**Beslut:**
- **Beställningsflöde:** Enkelt beställnings-/intresseförfrågningsformulär för smycken, unika beställningar och konstverk (samt kontakt). Inga varukorgar eller betalflöden tills vidare.
- **Lagring & admin-inkorg:** Inkomna beställningar och förfrågningar sparas i PostgreSQL och hanteras i en enkel inkorg i admin (med t.ex. status *Ny / Hanterad / Arkiverad*), skyddat med enkelt spamskydd (honeypot + rate-limit).
- **E-postnotiser:** Inga e-postnotiser tills vidare (hålls modulärt så det är enkelt att slå på senare vid behov).

---

## 4. Admingränssnittet
**Status:** Beslutad

- Vad ska administratören kunna hantera i admin?
  - Smycken (lägg till, redigera, ändra ordning, dölj/ta bort, pris och prisvarianter som *Armband/Ring* eller *Små/Stora*).
  - Konstverk och/eller konstprojekt.
  - Bilduppladdning med sortering och automatisk bildoptimering.
  - Fasta sidor/texter (*Min syn på smycken*, *Beställning och storlek*, *Returer*, *Allmänna villkor*, kontaktuppgifter).
- Hur ska inloggning till admin fungera? Räcker enkel och säker inloggning (användarnamn/e-post + lösenord) för 1–2 administratörer?

**Beslut:**
- **Inloggning:** **Google-inloggning** (samma `google-auth-library` + HTTP-only JWT-cookie som i dina övriga appar), med vitlistade admin-mejladresser i databasen (+ grund-admin via `.env` så man aldrig kan låsa sig ute).
- **Adminhantering:** Enkelt att lägga till och ta bort nya administratörer direkt i admingränssnittet.
- **Innehållshantering:** Smycken (inkl. kategorier & prisvarianter), Konst (enskilda verk & projekt/serier), Texter & fasta sidor, samt Förfrågningar (inkorg).
- **Utseende & Layout (utan programmering):** Egen inställningsflik i admin (styrd via databasinställningar + CSS-variabler) för att enkelt kunna ändra bakgrundsbilder, bakgrunds-/text-/accentfärger, startsidans upplägg (t.ex. gemensam startsida vs. direkt till Smycken/Konst), sektionsindelning/ordning, gallerikolumner m.m. — inklusive knapp för att återställa standardutseendet.
- **Mobilanpassning:** Fullt mobilanpassat admingränssnitt så man kan fota och ladda upp nya smycken/konstverk direkt från telefonen.

---

## 5. Migrering av gammalt innehåll
**Status:** Beslutad

- Ska vi bygga ett importskript som läser in alla befintliga smycken, texter och bilder från `innehall_katalog.json` och `bilder/` som startinnehåll?
- Ska platshållarsidan `project-01` hoppas över tills ni lägger in riktiga konstverk/projekt?

**Beslut:**
- **Engångsimport:** Ja, vi bygger ett importskript som läser in alla befintliga 20 smycken/unika beställningar, texter, fasta sidor och bilder från arkivet in i PostgreSQL och optimerar bilderna (WebP + thumbnails) direkt vid importen.
- **`project-01`:** Hoppas över vid import (oanvänd Wix-mallsida med exempelbilder), men ligger kvar i arkivmappen.
- **Arkivering:** Alla befintliga arkivfiler (`sidor_html/`, `sidor_markdown/`, `bilder/`, `innehall_katalog.json`, `arkiv_info.md`) flyttas in i en dedikerad `_arkiv/`-mapp för att hålla projektroten ren.

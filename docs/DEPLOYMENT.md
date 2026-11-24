# Driftsättningsguide – ZBook (Portainer & Cloudflare Tunnel) samt Molnflytt

Denna guide beskriver steg för steg hur du sätter upp nya **anna-lea.com** på din HP ZBook under test-/startdomänen **`mina-loggar.anna-lea.se`** — och hur du senare enkelt växlar över till skarpa **`anna-lea.com`** eller flyttar till en molntjänst.

---

## 1. Förbered mappar på ZBook (engångsjobb)

Logga in på ZBook via SSH och skapa de persistenta katalogerna för databas och uppladdade bilder (samma mönster som Fiskeloggen):

```bash
mkdir -p /home/anders/srv/anna-lea/db
mkdir -p /home/anders/srv/anna-lea/uploads
```

---

## 2. Google Cloud OAuth (för `/admin`)

I ditt Google Cloud-projekt (*APIs & Services → Credentials → OAuth 2.0 Client ID*):

1. Lägg till följande under **Authorized redirect URIs**:
   - `https://anna-lea.minaloggar.se/api/auth/callback`
   - *(Inför framtida skarp lansering: `https://anna-lea.com/api/auth/callback` och `https://www.anna-lea.com/api/auth/callback`)*
   - *(För lokal dev: `http://localhost:5176/api/auth/callback`)*
2. Kopiera **Client ID** och **Client Secret**.

---

## 3. Cloudflare Tunnel (`zbook_server`)

Återanvänder den befintliga gemensamma tunneln **`zbook_server`** i Cloudflare Zero Trust:
- **Subdomain / Domain:** `anna-lea.minaloggar.se`
- **Service URL:** `http://192.168.0.121:3004`

Ingen extra `tunnel`-container eller `CLOUDFLARE_TUNNEL_TOKEN` behövs i stacken.

---

## 4. Portainer Stack på ZBook

1. Om du startade en tillfällig `anna-lea-db` manuellt, ta bort containern först (**all data i `/home/anders/srv/anna-lea/db` ligger kvar intakt**):
   ```bash
   sudo docker rm -f anna-lea-db
   ```
2. Öppna **Portainer** på ZBook → **Stacks → Add stack**:
   - **Name:** `anna-lea`
   - **Build method:** *Repository* (`https://github.com/aengst/anna-lea`, branch `refs/heads/main`, fil `docker-compose.yml`).
3. Lägg in följande **Environment variables** i Portainer:

| Variabel | Värde |
| :--- | :--- |
| `DB_USER` | `annalea_user` |
| `DB_PASSWORD` | *(ditt lösenord från `.env`)* |
| `DB_NAME` | `annalea_prod` |
| `FRONTEND_URL` | `https://anna-lea.minaloggar.se` |
| `AUTH_REDIRECT_URI` | `https://anna-lea.minaloggar.se/api/auth/callback` |
| `GOOGLE_CLIENT_ID` | *(från Google Cloud)* |
| `GOOGLE_CLIENT_SECRET` | *(från Google Cloud)* |
| `JWT_SECRET` | *(din slumpade nyckel från `.env`)* |
| `INITIAL_ADMIN_EMAIL` | `aengst@gmail.com` |
| `HOST_UPLOADS_DIR` | `/home/anders/srv/anna-lea/uploads` |
| `HOST_DB_DIR` | `/home/anders/srv/anna-lea/db` |

4. Klicka på **Deploy the stack**. Portainer bygger `Dockerfile` lokalt på ZBook och startar de två containrarna:
   - `anna-lea` (port `3004`)
   - `anna-lea-db` (port `5440`)

Verifiera genom att öppna:
`https://anna-lea.minaloggar.se/api/health` → ska svara `{"status":"ok","service":"anna-lea-api","db":"connected"}`.

---

## 5. Importera allt gammalt innehåll (engångsjobb)

Eftersom `_arkiv/` ligger lokalt på din Windows-dator (utanför Git) kör du engångsimporten från din PC mot ZBook-databasen (med Cloudflare WARP aktivt):

1. Kopiera `.env.example` till `.env` i `anna-lea`-mappen och fyll i ZBooks databasuppgifter:
   ```env
   DB_HOST=192.168.0.121
   DB_PORT=5440
   DB_USER=annalea_user
   DB_PASSWORD=ditt_db_losenord
   DB_NAME=annalea_prod
   UPLOAD_PATH=./uploads
   INITIAL_ADMIN_EMAIL=din.epost@gmail.com
   ```
2. Kör importskriptet:
   ```powershell
   npm run import:archive
   ```
   Skriptet importerar alla 15 smycken, 5 vigselringar, 5 svenska informationssidor samt optimerar alla produktbilder och hero-bakgrunden till snabba WebP-filer i den lokala mappen `uploads/` (~2–4 MB totalt istället för 37 MB!).
3. Kopiera de optimerade bilderna till ZBook (en enda gång):
   ```powershell
   scp uploads\*.webp anders@192.168.0.121:/home/anders/srv/anna-lea/uploads/
   ```
4. Öppna `https://mina-loggar.anna-lea.se` — nu är hela sajten fylld med smycken, texter och bilder! Logga sedan in på `https://mina-loggar.anna-lea.se/admin` och lägg till Anna-Leas Gmail-adress under fliken **Admins**.

---

## 6. Löpande uppdateringar (ManualOps)

Precis som i Fågelloggen och Fiskeloggen:

```powershell
npm run release "beskrivning av ändring"
```

Gå sedan till Portainer → stacken `anna-lea` → **Pull and redeploy**. Databas och uppladdade bilder i `/home/anders/srv/anna-lea/` påverkas inte.

---

## 7. När det är dags att byta till skarpa `anna-lea.com`

Inga kodändringar krävs! Gör bara följande tre saker:
1. Lägg till `anna-lea.com` och `www.anna-lea.com` som Public Hostnames i Cloudflare Tunnel pekandes mot `anna-lea:3004`.
2. Lägg till `https://anna-lea.com/api/auth/callback` under Authorized redirect URIs i Google Cloud Console.
3. Uppdatera `FRONTEND_URL=https://anna-lea.com` och `AUTH_REDIRECT_URI=https://anna-lea.com/api/auth/callback` i Portainer och starta om stacken.

---

## 8. Framtida flytt till molntjänst

1. Skapa en hanterad PostgreSQL-databas (t.ex. Neon, Railway, Supabase eller DigitalOcean) och ta en backup från ZBook:
   ```bash
   docker exec anna-lea-db pg_dump -U annalea_user annalea_prod > annalea_backup.sql
   ```
   Importera `annalea_backup.sql` i den nya molndatabasen.
2. Driftsätt projektets `Dockerfile` i valfri molntjänst med miljövariabeln `DATABASE_URL` samt samma Google OAuth- och `JWT_SECRET`-variabler.
3. För bilder: kopiera `/home/anders/srv/anna-lea/uploads` till molntjänstens persistenta volym — eller byt ut de tre funktionerna i `server/services/storage.js` mot t.ex. Cloudflare R2 / AWS S3.

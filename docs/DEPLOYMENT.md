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
   - `https://mina-loggar.anna-lea.se/api/auth/callback`
   - *(Inför framtida skarp lansering kan du redan nu eller senare lägga till: `https://anna-lea.com/api/auth/callback` och `https://www.anna-lea.com/api/auth/callback`)*
   - *(För lokal dev-tunnel om du sätter upp en sådan: `https://anna-lea-dev.minaloggar.se/api/auth/callback`)*
2. Kopiera **Client ID** och **Client Secret**.

---

## 3. Cloudflare Tunnel

1. Skapa en ny tunnel i **Cloudflare Zero Trust → Networks → Tunnels** (t.ex. `anna-lea`) och kopiera dess `TUNNEL_TOKEN`.
2. Lägg till en **Public Hostname** i tunneln:
   - **Subdomain / Domain:** `mina-loggar.anna-lea.se`
   - **Service Type:** `HTTP`
   - **URL:** `anna-lea:3004` *(containernamnet i Docker-nätverket `anna-lea-net`)*

---

## 4. Pusha koden till GitHub & starta Portainer Stack

1. Initiera Git och pusha projektet `anna-lea` till ett nytt GitHub-repo (notera att `_arkiv/`, `.env` och `uploads/` automatiskt hoppas över via `.gitignore`).
2. Öppna **Portainer** på ZBook → **Stacks → Add stack**:
   - **Name:** `anna-lea`
   - **Build method:** *Repository* (peka på ditt GitHub-repo och `docker-compose.yml`).
3. Lägg in följande **Environment variables** i Portainer:

| Variabel | Exempelvärde |
| :--- | :--- |
| `DB_USER` | `annalea_user` |
| `DB_PASSWORD` | *(välj ett starkt lösenord)* |
| `DB_NAME` | `annalea_prod` |
| `FRONTEND_URL` | `https://mina-loggar.anna-lea.se` |
| `AUTH_REDIRECT_URI` | `https://mina-loggar.anna-lea.se/api/auth/callback` |
| `GOOGLE_CLIENT_ID` | *(från Google Cloud)* |
| `GOOGLE_CLIENT_SECRET` | *(från Google Cloud)* |
| `JWT_SECRET` | *(slumpad sträng, minst 48 tecken)* |
| `INITIAL_ADMIN_EMAIL` | *(din Google-e-postadress)* |
| `CLOUDFLARE_TUNNEL_TOKEN` | *(från Cloudflare Zero Trust)* |
| `HOST_UPLOADS_DIR` | `/home/anders/srv/anna-lea/uploads` |
| `HOST_DB_DIR` | `/home/anders/srv/anna-lea/db` |

4. Klicka på **Deploy the stack**. Portainer bygger `Dockerfile` lokalt på ZBook och startar de tre containrarna:
   - `anna-lea` (port `3004`)
   - `anna-lea-db` (port `5440`)
   - `anna-lea-tunnel`

Databasschemat skapas automatiskt vid första uppstarten! Verifiera genom att öppna:
`https://mina-loggar.anna-lea.se/api/health` → ska svara `{"status":"ok","service":"anna-lea-api","db":"connected"}`.

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

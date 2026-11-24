# Portainer-vänlig versions- och releasehantering – anna-lea.com

Denna guide beskriver hur versions- och releasehanteringen fungerar i **anna-lea.com** (samma smidiga modell som i Fiskeloggen och Fågelloggen).

---

## Hur det fungerar under huven

Eftersom Portainer drar ner koden från GitHub utan `.git`-mappen är rotens **`package.json`** projektets enda *Source of Truth* för versionsnumret:

1. **`scripts/release.js`** höjer versionen i `package.json`, skapar en samlad commit + annoterad Git-tagg (`vX.Y.Z`) och pushar allt till GitHub i ett enda steg.
2. **`Dockerfile`** läser `version` ur rotens `package.json` under bygget och skickar in den som `VITE_APP_VERSION` till React/Vite-bygget.
3. **`client/vite.config.js`** exponerar samma version som `__APP_VERSION__` (även vid lokal `npm run dev`).
4. **Synlig verifiering efter deploy:**
   - I **admin** (`/admin`, både på inloggningssidan och i toppbaren) visas `vX.Y.Z`.
   - I **publika sidfoten** visas en diskret `vX.Y.Z` bredvid *Admin*-länken.
   - På **`/api/health`** returneras `"version": "X.Y.Z"`.

---

## Släppa en ny version

Ställ dig i projektets rot (`anna-lea/`) och kör:

### Vanlig uppdatering (`patch`, t.ex. `0.1.0` → `0.1.1`)
```powershell
npm run release "fix: justerat bildmarginaler i smyckesgalleriet"
```

### Ny funktion (`minor`, t.ex. `0.1.1` → `0.2.0`)
```powershell
npm run release minor "feat: lagt till ny sektion på startsidan"
```

### Med extra detaljerad releasenote (valfritt)
```powershell
npm run release minor "feat: förbättrad konstvy" "- Filtrering på år\n- Snabbare bildvisning"
```

---

## Uppdatera på ZBook i Portainer

1. Öppna **Portainer → Stacks → `anna-lea`**.
2. Klicka på **Pull and redeploy**.
3. Slå **PÅ** reglaget **"Re-pull image and redeploy"** och klicka på **Update**.
4. Kontrollera att nya versionsnumret syns på **`https://anna-lea.minaloggar.se/api/health`** eller i sidfoten / `/admin`!

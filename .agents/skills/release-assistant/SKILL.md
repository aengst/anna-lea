---
name: release-assistant
description: Hjälper till att skapa releasenotes på svenska, höja version i package.json, tagga och pusha en ny release av anna-lea.com inför Portainer-uppdatering.
---

# Release-assistent för anna-lea.com

Använd denna procedur när användaren vill skapa en ny release och pusha till GitHub inför driftsättning i Portainer:

1. **Analysera ändringar sedan senaste tagg** (eller hela git status / senaste commits om ingen tagg finns ännu):
   ```powershell
   git status --short
   $lastTag = git describe --tags --abbrev=0 2>$null
   if ($lastTag) { git log "$lastTag..HEAD" --oneline; git diff $lastTag --stat } else { git log -n 10 --oneline }
   ```

2. **Föreslå versionstyp och releasenote på svenska:**
   - **Versionstyp:** `patch` (buggfixar/små justeringar), `minor` (nya funktioner) eller `major` (större omskrivningar).
   - **Titel:** Formaterad enligt *Conventional Commits* på svenska (t.ex. `feat(admin): lägg till ...` eller `fix(galleri): ...`).
   - **Body:** Kort punktlista uppdelad i t.ex. *"Nyheter & Förbättringar"* och *"Tekniska rättningar"*.

3. **Be alltid användaren om godkännande** innan `npm run release` körs.

4. **Kör releasen när användaren godkänt:**
   ```powershell
   npm.cmd run release <patch|minor|major> "TITEL_HÄR" "BODY_HÄR"
   ```
   *(Kom ihåg: om `git push` kräver nätverk utanför sandboxen, kör med `BypassSandbox: true`.)*

5. **Påminn användaren om sista steget i Portainer:**
   - Öppna stacken **`anna-lea`** i Portainer → **Pull and redeploy** → slå **PÅ** *"Re-pull image and redeploy"* → **Update**.
   - Verifiera nya versionen i `/admin`, sidfoten eller `https://anna-lea.minaloggar.se/api/health`.

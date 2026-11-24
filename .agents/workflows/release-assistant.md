---
description: Hjälp med att generera releasenotes och köra release-skriptet för anna-lea.com
---

Denna workflow hjälper dig att skapa snygga releasenotes på svenska baserat på dina senaste ändringar och köra det automatiserade release-skriptet.

1. Analysera ändringar sedan senaste taggen (eller senaste commits om ingen tagg finns):
```powershell
git status --short
git log -n 10 --oneline
```

2. Generera ett förslag på versionstyp (`patch` / `minor` / `major`) och releasenote:
   - **Titel:** Kort sammanfattning enligt *Conventional Commits* på svenska (t.ex. `feat(admin): ...`, `fix(ui): ...`).
   - **Body:** Tydlig punktlista uppdelad i *"Nyheter & Förbättringar"* och *"Tekniska rättningar"*.

3. Be alltid användaren om godkännande innan releasen körs.

4. När godkänt, kör releasen:
```powershell
npm.cmd run release patch "TITEL_HÄR" "BODY_HÄR"
```
*(Byt ut `patch` mot `minor` eller `major` vid behov.)*

5. Uppdatera stacken **`anna-lea`** i Portainer med **Re-pull image and redeploy** påslaget, och verifiera nya versionsnumret i `/admin`, sidfoten eller `/api/health`.

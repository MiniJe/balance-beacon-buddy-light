# ANALIZĂ APLICAȚIE (VARIANTA "LIGHT")

Această analiză inventariază structura actuală a aplicației, identifică suprapuneri, cod mort, funcții duplicate și lacune funcționale, rezultând un plan de remediere. Versiunea curentă NU mai folosește Azure SQL și Azure Blob Storage – există încă rămășițe de cod orientate spre implementarea originală ce trebuie curățate.

---
## 1. ARHITECTURĂ GENERALĂ
- Frontend: React + TypeScript + Vite, structură: `frontend/src` cu componente, pagini, hooks.
- Backend: Express + SQLite. Straturi: controllers, services, routes, middleware. Persistență: SQLite DB local, plus stocare fișiere pe disc (`folder.settings.service` + `local.storage.service`).
- Autentificare: serviciu unificat (`auth.unified.service.ts`) + middleware JWT.
- Domenii majore: Setări companie, Setări foldere, Upload & stocare locală fișiere (logo, documente), Cereri confirmare, Șabloane (template), Email tracking & jurnalizări, Backup, Permisiuni, Reminder automat.

---
## 2. BACKEND – STRUCTURĂ ȘI SUPRAPONERI
### 2.1 Controllers
Principali:
- `company.settings.controller.ts` – CRUD setări companie.
- `folder.settings.controller.ts` – CRUD și test acces directoare.
- `local.storage.controller.ts` – upload/serve/delete logo + listare.
- `pdf.controller.ts` + `pdf.service.ts` – generare PDF.
- `template.controller.ts` – gestiune șabloane.
- `auth.unified.controller.ts` – login unificat.
- `email.controller.ts` și `email.controller.sqlite.ts` – posibilă versiune duală (Azure vs SQLite) – de evaluat eliminarea unuia.
- `backup.controller.ts` și `simple-backup.controller.ts` – două abordări pentru backup (complex vs simplu) – decide consolidare.
- Jurnale: `jurnal.*.controller.ts` multiple (email, documente emise, cereri confirmare, sesiuni) – fiecare mapat la servicii dedicate.

Observație: există redundanțe între *simple* vs *complet*, și între variante Azure / light.

### 2.2 Services
Servicii critice curente:
- `company.settings.service.ts` – SQLite table SetariCompanie, update + init.
- `folder.settings.service.ts` – gestionează SetariFoldere și derivă `logosPath` etc.
- `local.storage.service.ts` – scriere fișiere (logo) la path configurabil, fallback uploads/logos.
- `storage.service.ts` / `advanced.storage.service.ts` – aparent orientare anterioară (posibil Azure) – de verificat dacă mai sunt folosite.
- `template.service.ts` și `template.service.sqlite.ts` – dublură (Azure vs SQLite). În varianta light ar trebui păstrat doar sqlite.
- `SetariBackupService.ts` și `SetariBackupService.sqlite.ts` – dublu strat – păstrare doar *.sqlite.*.
- `email.service.ts` + monitor/tracking + multiple servicii jurnal – ok, dar verificat dacă toate endpoint-urile le apelează.
- `pdf.generation.service.ts` vs `pdf.service.ts` – pot fi consolidate (naming clar: unul orchestration, altul generare low-level?).

### 2.3 Cod Mort / Rămășițe Azure
- Orice fișier cu sufix `.azure` inexistent acum; însă nume duale `*.sqlite.ts` indică tranziție.
- Servicii: `storage.service.ts` ar putea conține logica pentru Azure Blob – revizuire și eliminare dacă nefolosită.
- Controller `email.controller.ts` vs `email.controller.sqlite.ts`: păstrează doar varianta care este referită de `server.ts` (momentan `emailRoutes` – verifică ce export folosesc). Dacă doar unul e montat în `server.ts`, celălalt se marchează pentru ștergere.

### 2.4 Persistență Logo
Flux actual:
Upload (POST `/api/storage/local/upload-company-logo`) -> `local.storage.controller` -> `local.storage.service.saveCompanyLogo()` -> actualizează `CaleLogoCompanie` în BD.
Serve (GET `/api/storage/local/logos/:companyId/:filename`) -> return fișier \* cu cache.
Delete -> șterge fișier și curăță referința DB.
Status: Funcțional. Necesită doar curățare UI duplicat.

---
## 3. FRONTEND – STRUCTURĂ ȘI SUPRAPONERI
### 3.1 Componente relevante pentru setări
- `components/settings/CompanyTab.tsx` – componentă veche, fetch/save inline, încă afișează câmp text pentru logo.
- `pages/settings/components/CompanySettings.tsx` – componentă nouă (plan de înlocuire) + hook.
- `hooks/useCompanySettings.ts` – centralizează logica (fetch, save, upload, delete). Corectă pentru varianta finală.

### 3.2 Alte zone potențial duplicate
- Există atât pagină `Settings.tsx` cât și tab components sub `components/settings/` – decide dacă mutăm totul sub pages/* pentru coerență.
- Template / Requests – multiple componente step (Step1SelectPartners, Step2Configure) – OK, dar verifică orice componentă abandonată (navigare nouă?).

### 3.3 Alias și importuri
`tsconfig.json` definește `@/*` -> `src/*`. Funcționează în celelalte fișiere. Erori anterioare la `CompanySettings.tsx` probabil cauzate de compilare parțială sau lipsă export componentă.

### 3.4 UI Logo
Situație actuală: două paradigme concurente
- Veche: Introducere manuală URL (CompanyTab)
- Nouă: Upload local + preview (CompanySettings + hook)
Decizie: Elimină câmp text și componenta veche.

---
## 4. LISTĂ DUPLICATE / SUPRAPONERI
| Domeniu | Fișiere implicate | Problemă | Acțiune recomandată |
|---------|-------------------|----------|---------------------|
| Setări companie (UI) | CompanyTab.tsx vs CompanySettings.tsx + hook | Dublură logică și UI | Păstrează CompanySettings + hook, șterge CompanyTab |
| Logo upload | Câmp text vs upload real | Interfață inconsistentă | Elimină câmp text, doar upload |
| Template servicii | template.service.ts vs template.service.sqlite.ts | Dublu backend storage layer | Păstrează varianta sqlite, marchează cealaltă pentru ștergere |
| Backup servicii | SetariBackupService.ts vs SetariBackupService.sqlite.ts | Dublare | Păstrează *.sqlite.*, șterge rest |
| Email controller | email.controller.ts vs email.controller.sqlite.ts | Dublare | Verifică montarea; păstrează doar folosit |
| PDF servicii | pdf.generation.service.ts vs pdf.service.ts | Potențial overlap | Documentare responsabilități + eventual unificare |
| Storage servicii | local.storage.service.ts vs storage.service.ts vs advanced.storage.service.ts | Legacy Azure vs local | Păstrează local.storage.service.ts, elimină rest dacă neapelate |
| Backup controller | backup.controller.ts vs simple-backup.controller.ts | Două versiuni | Decide una (simplă) |

---
## 5. LACUNE FUNCȚIONALE IDENTIFICATE
| Zonă | Observație | Propunere |
|------|------------|-----------|
| Schimbare CUI după upload logo | Logo nu este mutat automat | La update CUI: dacă există vechi CUI + logo, mută folderul vechi -> nou + actualizează DB |
| Validare câmpuri companie | Validare minimă | Adaugă regex CUI / lungime IBAN / ONRC pattern optional |
| Feedback upload | Fără feedback vizual (toast dezactivat) | Adaugă badge / mic text “Încărcat la hh:mm” |
| Cache busting logo | Folosit query param t=timestamp | OK, eventual centralizează în helper |
| Securitate fișiere | Servește direct cu `Access-Control-Allow-Origin: *` | Dacă sunt date sensibile, restricționează (probabil OK pentru logo) |
| Permisiuni rol la setări | Controller setări companie pare accesibil cu doar auth | Adaugă middleware rol (ex: MASTER) |
| Logging voluminos | Multe console.log emoji | Introdu nivele logger (debug/info/error) + toggle |
| Curățare tabele inițializare | Unele servicii păstrează metode initialize* neapelate | Elimină sau mută într-un script de migrare |

---
## 6. RISCURI ȘI PRIORITĂȚI
| Prioritate | Problemă | Impact | Rezolvare |
|-----------|----------|--------|-----------|
| High | UI dublat (CompanyTab) | Confuzie utilizator | Eliminare + redirect |
| High | Servicii duplicate (template/backup/email/storage) | Cod mort, risc divergență | Audit referințe, ștergere |
| Medium | Lipsă control rol la update companie | Securitate | Adaugă `roleMiddleware(['MASTER'])` |
| Medium | Schimbare CUI nu gestionează logo | Inconsistență fișiere | Implementă mutare la update CUI |
| Low | Logging excesiv | Zgomot | Introdu config log level |
| Low | Lipsă UI status upload | UX | Mic indicator text |

---
## 7. PLAN DE REMEDIERE (SPRINT SUGERAT)
Faza 1 – Curățare (ziua 1):
1. Elimină `CompanyTab.tsx` și referința sa din `Settings.tsx`.
2. Elimină serviciile/controllerele neutilizate (identificare prin grep + referințe import):
   - `template.service.ts` (dacă nu e importat nicăieri)
   - `SetariBackupService.ts` (păstrează varianta sqlite)
   - `email.controller.ts` sau `email.controller.sqlite.ts` (după montaj real)
   - `storage.service.ts`, `advanced.storage.service.ts` dacă neapelate.
3. Curăță console.log redundante (păstrează doar info + error).

Faza 2 – Consolidare (ziua 2):
4. Adaugă rol MASTER la rutele: `/api/company-settings` și `/api/folder-settings` update.
5. Unifică PDF servicii (documentează ce face fiecare, păstrează unul).
6. Extra helper pentru cache-busting imagini.

Faza 3 – Îmbunătățiri (ziua 3):
7. Implementă mutare logo la schimbare CUI (funcție în `local.storage.service`: `moveCompanyLogo(oldId, newId)`).
8. Validare extinsă: CUI (RO optional + cifre), IBAN (RO\d{2}[A-Z]{4}.*), ONRC (pattern simplu J\d+\/...).
9. Adaugă indicator vizual după upload: “Logo actualizat (hh:mm)”.

Faza 4 – Refactor & Docs (ziua 4):
10. Elimină metode initialize* neutilizate (sau mută în script `scripts/migrate.ts`).
11. Scrie README secțiune “Diferențe versiune light vs original”.
12. Completează această analiză cu status final și ce a fost șters.

---
## 8. FUNCȚII CARE POT FI EXTRASE / CENTRALIZATE
| Funcționalitate | Locație actuală | Propunere |
|-----------------|-----------------|-----------|
| Cache busting logo | Hook upload | Util `src/utils/cache.ts` |
| Validări companie | Hook | `shared/validation/company.ts` |
| Construire URL logo | Hook + service | Helper `buildLogoUrl(relative)` |
| Mutare logo on CUI change | (inexistent) | `local.storage.service.ts` nouă metodă |
| Logging standard | Console dispersat | `utils/logger.ts` |

---
## 9. ELEMENTE POSIBIL NEFOLOSITE (NECESITĂ VERIFICARE GREP)
- `advanced.storage.service.ts`
- `storage.service.ts`
- `template.service.ts` (dacă only sqlite variant used)
- `SetariBackupService.ts`
- `email.controller.ts` (dacă montat e doar varianta SQLite) 
- Orice importer către Azure / Blob (nu par prezente acum, dar confirmare completă necesită căutare după `Blob` / `Azure`).

---
## 10. CHECKLIST EXECUȚIE
[ ] Înlocuit tab Companie cu CompanySettings
[ ] Șters CompanyTab.tsx
[ ] Rulat grep pentru servicii duplicate și confirmat neutilizare
[ ] Adăugat protecție rol la update setări
[ ] Implementat mutare logo la schimbare CUI
[ ] Curățat loguri debug emoji
[ ] Validări extinse câmpuri companie
[ ] Actualizat documentație README / ANALIZĂ-APP.md

---
## 11. CONCLUZIE
Aplicația a evoluat dintr-o versiune Azure către una locală. Persistă straturi paralele (Azure vs SQLite) care trebuie curățate pentru a reduce complexitatea și riscul de inconsistență. Adoptarea unui singur set de componente (CompanySettings + hook) și eliminarea serviciilor neutilizate este primul pas. După stabilizare se pot adăuga optimizări (mutare logo la schimbare CUI, validări extinse, logging structurat).

---
## 12. URMĂTORI PAȘI IMEDIAȚI
1. Confirmă că dorești ștergerea componentelor și serviciilor marcate.
2. Execută Faza 1 din plan (cleanup UI + servicii duplicate).
3. Revizuiește din nou ANALIZĂ-APP.md după cleanup pentru actualizare.

Spune “Execută Faza 1” pentru a aplica automat modificările propuse.

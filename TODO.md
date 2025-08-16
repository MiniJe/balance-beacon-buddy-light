# TODO Azure Removal (Versiunea LIGHT / Full SQLite)

Obiectiv: Eliminare completă a dependențelor Azure (SQL + Blob) și codului mort, mutarea tuturor fluxurilor la SQLite + filesystem local.

## 1. Inventar Referințe Azure Rămase
(Rezultate recente grep pentru `../config/azure` – verifica din nou înainte de execuție)
- controllers/backup.controller.ts (pool, blob storage clients)
- controllers/email-monitor.controller.ts (pool)
- controllers/database.controller.ts (pool) [verifică dacă mai e folosită ruta]
- services/email-monitor.service.ts (pool)
- services/creare.cont.contabil.ts (DEPRECATED) (azurePool)
- services/contabil.service.ts (DEPRECATED) (azurePool)
- services/JurnalDocumenteEmiseService.ts (DEPRECATED)
- services/database.service.ts (DEPRECATED)
- config/azure.ts (stub compatibilitate)

## 2. Decizii Strategice (alege Variantele)
A. Minimal: Ștergere module Azure + stub; dezactivare funcționalități (backup blob, email monitor SQL) până la rescriere.
B. Portare completă:
  - Backup: local FS + export JSON din SQLite.
  - Email monitor: stocare răspunsuri în tabele SQLite, procesare periodică.
  - Permisiuni / jurnal: deja portate.

(RECOMANDARE) Faza 1: Variantă A (curățare + stub removal) => Faza 2: Re-implementare locală incrementală.

## 3. Pași Execuție (Checklist)
[ ] 3.1 Re-rule grep pentru confirmare actualizată: `grep -R "../config/azure" backend/src`.
[ ] 3.2 Elimina fișiere DEPRECATED:
     - backend/src/services/creare.cont.contabil.ts
     - backend/src/services/contabil.service.ts
     - backend/src/services/JurnalDocumenteEmiseService.ts
     - backend/src/services/database.service.ts
[ ] 3.3 În backup.controller.ts:
     - Scoate toate importurile Azure.
     - Introdu nou serviciu: LocalBackupService (export DB + copy uploads/templates/logos).
     - Înlocuiește testele Azure cu rezultate noop marcate.
     - Marchează rutele blob/SQL ca deprecated (HTTP 410) dacă nu rescrise.
[ ] 3.4 În email-monitor.service/controller:
     - Decide: temporar DISABLED (return 501) SAU portar la SQLite.
     - Dacă portar: creează migrare tabele (vezi Secțiunea 5) + adaptează interogări.
[ ] 3.5 controllers/database.controller.ts – dacă doar Azure health check, șterge ruta / controller.
[ ] 3.6 Actualizează importuri rămase către azure.ts și elimină-le.
[ ] 3.7 Șterge config/azure.ts după ce nu mai există importuri (grep pentru `config/azure`).
[ ] 3.8 Curăță dependențe din package.json (backend):
     - mssql
     - @azure/storage-blob (și alte @azure/* dacă există)
[ ] 3.9 Rule `npm prune && npm install` (backend) și validează build.
[ ] 3.10 Actualizează README / DEPLOYMENT / REPORTS_AZURE_SQL_INTEGRATION.md:
     - Adaugă notă: Azure eliminat în versiunea LIGHT.
     - Mută fișierele istorice Azure într-un folder `legacy/` (opțional) sau arhivează.
[ ] 3.11 Adaugă script de backup SQLite (ex: `scripts/backup_sqlite.ts`).
[ ] 3.12 Adaugă test rapid pentru ContabilSQLiteService + MasterPermissionsService.
[ ] 3.13 Verifică env vars și șterge AZURE_* (în .env.example / docs).
[ ] 3.14 Commit incremental: "chore(azure-removal): remove deprecated azure services".
[ ] 3.15 QA Smoke:
     - Creare contabil
     - Listare contabili
     - Setare permisiuni master
     - Generare document jurnal (SQLite service)
     - Backup local (nou flux)
[ ] 3.16 Eliminare cod mort suplimentar (tipuri, modele neverificate care erau doar pentru Azure).
[ ] 3.17 Final commit: "refactor: drop azure.ts stub and finalize sqlite migration".

## 4. Ordine Recomandată Implementare
1. Ștergere fișiere DEPRECATED (3.2) – build trebuie să treacă.
2. Refactor backup controller (3.3) – înlocuiește dependințele pentru a debloca azure.ts removal.
3. Dezactivare temporară email monitor (3.4) – reasigură build curat.
4. Remove azure.ts + dependencies (3.6–3.8).
5. Add local backup script + tests (3.11–3.12).
6. Documentație și cleanup variabile (3.9–3.10, 3.13).
7. QA & final commits (3.15–3.17).

## 5. Migrare Tabele Necesare (dacă se portează Email Monitor)
Adaugă în migrările SQLite (config/sqlite.ts) detecție + CREATE dacă lipsesc:
- JurnalEmail (subset coloane folosite de monitor)
- EmailRaspunsuriOrphan
- JurnalCereriConfirmare (coloane minime pentru update status)

## 6. Local Backup (Spec Simplificat)
Input: POST /api/backup/manual
Output: JSON { success, folder, files[], tables[] }
Pas:
 1. Copiere fișiere: uploads/, templates/, logos/ (dacă există).
 2. Export tabele selectate -> JSON (nume_tabel.json) într-un folder timestamp.
 3. Manifest manifest.json.
Edge cases: folder absent (creează), fișiere mari (ignora > size threshold?), locked DB (retry / PRAGMA wal_checkpoint).

## 7. Verificări Finale (Quality Gates)
- grep "config/azure" -> 0 rezultate
- npm run build (backend) OK
- npm audit (opțional) fără mssql / @azure pachete
- Teste unitare noi OK
- README reflectă schimbările

## 8. Riscuri / Mitigare
- Cod rezidual importă tipuri Azure -> FAIL build (rulează TypeScript compile după fiecare ștergere majoră).
- Email monitor necesită logica IMAP; temporar dezactivare pentru a nu bloca eliminarea Azure.
- Backup blob eliminat: comunică clar în docs alternative locale.

## 9. Follow-up (Opțional)
- Implementare plugin modular pentru viitori provideri cloud (interface BackupProvider).
- Re-introducere email monitor cu queue + rate limiting.
- Normalizare definitivă PermisiuniAcces vs PermisiuniSpeciale (migrare DB).

---
Ultima actualizare: 2025-08-12
Responsabil sugerat: (assign în issue tracker)

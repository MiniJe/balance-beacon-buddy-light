# UPGRADE.md

Document: Recomandări evolutive pentru fluxul de generare și trimitere cereri confirmare sold
Status curent: Funcțional – testat single & multi‑partener; șabloane completate corect; emailuri trimise; semnătură PDF aplicată și validată; jurnalizare extinsă.

## 1. Obiectiv General
Aliniere la regulile de business stricte: niciun artefact persistent fără acțiune efectivă (email trimis + PDF semnat + șablon valid). Optimizare performanță și robustețe (fail‑fast controlat, audit clar, prevenție erori viitoare de template).

## 2. Recomandări Prioritare (ordine sugerată)
1. Reordonare flux ("pre‑flight" per partener) înainte de orice INSERT: (IMPLEMENTAT)
   - (a) Determinare template & încărcare conținut
   - (b) Procesare șablon cu EmailTemplateProcessor (strict)
   - (c) Verificare existență + semnătură PDF (hash semnat != hash original; stare semnătură OK)
   - (d) Numai dacă toate trec => persistă cererea + jurnal + trimite email
2. Cache templateId per partener (Map în contextul sesiune) pentru a evita recalculările.
3. Statistici sesiune retur (structură JSON): { total, trimiseOk, skipTemplateError, skipSemnatura, skipAltele }.
4. Flag configurabil strictMode (implicit true) în EmailTemplateProcessor pentru eventual mod tolerant (future toggle).
5. Teste automate:
   - Unit: EmailTemplateProcessor (scenarii: ok, missing var, unknown token, fallback NUME_COMPANIE, PERIOADA)
   - Integrare: orchestrator multi‑partener (1 eșec template, 1 PDF nesemnat, 1 succes)
6. Monitorizare proactivă: job (sau script) care interoghează JurnalEmail pentru pattern rezidual: content LIKE '%[{]%' OR '%}%' – alertare timpurie.
7. Hardening jurnal:
   - Trunchiere content salvat (ex: max 64KB) + păstrare hash SHA256(content complet)
   - Limită dimensiune atașament (config) + avertisment dacă depășită.
8. Consolidare meta semnătură: stocare câmp suplimentar (ex: JSON: { semnat: true, hashOriginal, hashSemnat, timestampSemnare }).
9. Eliminare duplicate logice: extrage logică determinare companie emitentă într-un util (reused între generator & processor).
10. Mecanism "health check" pentru șabloane: la start aplicație rulează procesor pe fiecare EmailSablon cu un set dummy de date (raportează ce variabile lipsesc / necunoscute).
11. Validare email partener (nou) la creare / editare (sintaxă + MX + blacklist disposable) – vezi Secțiunea 8.
12. (Nou) Verificare/ remediere flux ștergere partener (soft‑delete) – aparent actualul endpoint nu reflectă schimbarea în SQLite (vezi Secțiunea 10).

## 3. Detalii Implementare Cheie
### 3.1 Pre‑Flight Pattern (IMPLEMENTAT)
Funcție: preFlightPartener(partenerCtx) -> { ok, motiv?, processedHtml, pdfPathSemnat, meta }
- Nu scrie în DB.
- ok=false => se incrementează un contor și se sare peste persistență & trimitere.

### 3.2 Reordonare Persistență (IMPLEMENTAT)
Actual: INSERT cerere înainte de procesare șablon.
Nou: numai după preFlight.ok === true.
Consecință: JurnalCereriConfirmare nu mai conține intrări pentru acțiuni neefectuate.

### 3.3 EmailTemplateProcessor strictMode
Semnătură: processTemplateContent(content, partnerData, options?: { strictMode?: boolean })
- Dacă strictMode=false => doar log warnings, nu throw.

### 3.4 Statistici Sesiune
Interfață return orchestration: {
  sessionId, totalParteneri,
  trimiseOk, skipTemplateError, skipSemnatura, skipAltele,
  durataMs, timestampStart, timestampEnd
}

### 3.5 Caching Template
Map<cheiePartener, { templateId, templateContent }>
Cheie poate fi idPartener sau (categorie + tip) după logică existentă.

### 3.6 Teste (outline)
- processor.spec.ts
- orchestrator.preflight.spec.ts
- integration.multiPartner.spec.ts

### 3.7 ID Partener – Standardizare (IMPLEMENTAT)
- Istoric Azure SQL: newsequentialid() => GUID-uri secvențiale, uppercase.
- Nou: UUID v7 (ordonabil temporal) generat cu biblioteca uuid, convertit la UPPERCASE pentru consistență.
- Beneficiu: păstrează ordonare aproximativă în inserții (mai bun pentru indexuri) și format unitar.

### 3.8 Serviciu Extragere Date Partener (SQLite) (IMPLEMENTAT)
- Refactor de la pool MSSQL la getDatabase() SQLite.
- Eliminat dependințe sql.UniqueIdentifier.
- Query mapat pe coloane existente (IdPartener, NumePartener etc.).
- Logging adaptat.

## 4. Checklist Rapid
[x] Implement preFlightPartener
[x] Mutare ordine persistență după pre-flight
[x] Standard ID Partener: UUID v7 UPPERCASE
[x] Refactor partener.data.extraction.service la SQLite
[ ] Adăugare statistici sesiune în rezultat
[ ] Cache templateId / conținut
[ ] strictMode param în processor
[ ] Teste unit + integrare minime
[ ] Script health-check șabloane (opțional cron/manual)
[ ] Limită dimensiune content / atașamente + hash
[ ] Consolidare meta semnătură PDF
[ ] Validare email partener (sintaxă + MX + blacklist)
[ ] Verificare/fix flux ștergere partener (soft-delete) -> Înlocuit cu hard delete (DELETE FROM Parteneri) ✅

## 5. Istoric Relevant (Context)
- Rezolvată problema placeholder‑elor neînlocuite (diferență format DB: [VAR]).
- Adăugată validare fail‑fast + jurnalizare HTML final.
- Semnătura PDF impusă; blocare trimitere atașament nesemnat.
- UUID v7 uppercase introdus pentru IdPartener.
- Serviciul de extragere partener portat pe SQLite.

## 6. Notă Audit
Dacă se dorește totuși evidență pentru eșecuri fără poluarea tabelelor principale, se poate introduce tabel separat JurnalPreFlightEsec (idPartener, motiv, timestamp, metaHash) non‑critic.

## 7. Pași Imediați Sugerați
1. Return statistici sesiune.
2. Cache templateId.
3. Introduce teste Processor.
4. Implementare validare email partener.
5. Verificare și corectare flux soft-delete PartenerActiv. -> Înlocuit: implementat hard delete definitiv pentru parteneri. PartenerActiv rămâne doar pentru (de)activare manuală prin editare.

## 8. Validare Email Partener (Nou)
### Obiectiv
Prevenirea introducerii / păstrării partenerilor fără email valid – evită blocaje în fluxul de trimitere și asigură calitatea datelor.

### Niveluri Validare
1. Sintaxă (regex robust, lungime < 255, trim, lowercase)
2. Domeniu: MX lookup obligatoriu (configurable fail-soft / fail-hard)
3. Blacklist domenii temporare / disposable (listă locală actualizabilă)
4. (Opțional) SMTP handshake superficial – DOAR manual / task batch (nu în flux sync)

### Utilitar Backend (pseudo-code)
```
function isValidEmailSyntax(email: string): boolean {
  if (!email) return false;
  const e = email.trim();
  if (e.length > 254) return false;
  const regex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i; // RFC simplificat
  return regex.test(e);
}

async function hasMx(domain: string): Promise<boolean> {
  try { const rec = await dns.resolveMx(domain); return rec.length > 0; } catch { return false; }
}
```

### Flux updatePartener
1. Normalizare: email = trim().toLowerCase()
2. if !isValidEmailSyntax → 400
3. domain = substring după '@'
4. if domain in disposableSet → 400 / flag
5. if !(await hasMx(domain)) → 422 (sau warning dacă config failSoft)
6. Persistă

### Blacklist Domenii
Fișier: `static/disposable-domains.txt` → încărcat la startup într-un Set. Ex: temp-mail.org, mailinator.com, 10minutemail.com

### Endpoint Opțional
GET /api/parteneri/validate-email?email=... → { validSyntax, hasMx, blockedDomain }

### Migrare Date Existente
- Script: marchează înregistrări cu email invalid într-o coloană nouă `EmailValid` (0/1) sau creează listă raport.
- Curățare manuală.

### Frontend
- Validare onBlur (regex)
- Indicativ status (badge verde/roșu)
- Buton “Reverifică domeniul” (apelează endpoint MX)

### Considerații Performanță
- Cache MX results (Map<string, { hasMx: boolean; checkedAt: Date }>) TTL ~24h.
- Evită MX lookup la fiecare listare; doar la create/update sau la endpoint explicit.

### Config Flags
- EMAIL_VALIDATE_MX=true/false
- EMAIL_FAIL_SOFT=true/false (dacă true: acceptă dar marchează warning)

## 9. Roadmap Scurt
Q1: statistici sesiune, cache template, validare email, test hard delete
Q2: strictMode toggle, health-check, hardening jurnal
Q3: audit extins semnături + script curățare șabloane moarte

## 10. Observație / Anomalie Flux Ștergere Partener
Simptom: “Ștergerea” (dezactivarea) unui partener din aplicație nu se reflectă în tabela Parteneri (SQLite) conform observației.

Verificări recomandate:
- Endpoint DELETE: confirmă că lovește controllerul și că se apelează PartenerService.deletePartener.
- Verifică path DB și instanța (posibil dublu fișier .db în alt folder).
- Log temporar la începutul deletePartener: SELECT PartenerActiv înainte/după UPDATE.
- Confirmă că tranzacția nu e blocată de alt connection handle.

Remediere potențială:
- Forțează UPDATE explicit: `UPDATE Parteneri SET PartenerActiv=0, DataModificarePartener=datetime('now','localtime') WHERE IdPartener=?` (deja în cod) – dacă changes=0, log ID și existența.
- Asigură index pe IdPartener (PRIMARY KEY TEXT implicit e suficient).
- Adaugă test integrat pentru hard delete (DELETE elimină rândul; referințe inexistente).

Versiune document: 1.2

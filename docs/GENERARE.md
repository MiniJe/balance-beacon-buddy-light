# Fluxul de generare și emitere a cererilor de confirmare de sold

Acest document descrie, pas cu pas, procesul complet de generare și emitere a cererilor de confirmare de sold în aplicație (Step 1 - Step 5), cu detalii despre fișierele și funcțiile implicate la fiecare etapă.

---

## Step 1: Inițierea sesiunii și selectarea partenerilor
- **Scop:** Utilizatorul selectează partenerii pentru care dorește să emită cereri de confirmare de sold.
- **Fișiere implicate:**
  - `backend/src/routes/confirmareSold.route.ts` (sau similar)
  - `backend/src/controllers/confirmareSold.controller.ts`
  - `frontend/src/pages/ConfirmareSoldPage.vue/tsx/ts` (sau similar)
- **Funcții cheie:**
  - `startConfirmareSoldSession()`
  - `getAvailablePartners()`
- **Detalii:**
  - Se creează o sesiune nouă (sau se reia una existentă).
  - Se selectează partenerii și se salvează în sesiune (de obicei în DB sau memorie).

---

## Step 2: Generarea datelor de sold și validarea acestora
- **Scop:** Se extrag și se validează datele de sold pentru fiecare partener selectat.
- **Fișiere implicate:**
  - `backend/src/services/sold.service.ts`
  - `backend/src/models/Partner.ts`
- **Funcții cheie:**
  - `getSoldForPartner(partnerId)`
  - `validateSoldData(soldData)`
- **Detalii:**
  - Pentru fiecare partener, se extrag datele de sold din baza de date.
  - Se validează datele (ex: lipsă sold, sold negativ, etc).
  - Se marchează partenerii cu probleme pentru a fi tratați separat.

---

## Step 3: Generarea documentelor (DOCX/PDF) + pre-generarea emailurilor și jurnalul
- **Scop:** Se generează documentele pentru fiecare partener, se pregenerează conținutul emailurilor și se loghează acțiunile în jurnal.
- **Fișiere implicate:**
  - `backend/create-template.js` sau `backend/create_fise_template.js`
  - `backend/scripts/advanced_pdf_generator.py`, `backend/scripts/convert_docx_to_pdf.py`, `backend/scripts/extract_placeholders.py`
  - `backend/src/services/template.processor.sqlite.ts`
  - `backend/src/services/jurnal.service.ts`
- **Funcții cheie:**
  - `generatePdfForPartner(partnerData)` (apelează generatorul DOCX/PDF cu același set de variabile)
  - `EmailTemplateProcessor.processTemplateContent(templateContent, partnerData)` (pregenerează corpul emailului)
  - `logActionToJournal(action, partnerId)`
- **Detalii:**
  - Se construiește un „map” de variabile pornind strict din `VariabileSabloane` + `partnerData` (aceleași valori pentru DOCX și pentru email).
  - Se generează DOCX/PDF folosind setul de variabile (prin scripturile Python/JS de mai sus).
  - Se pregenerează corpul emailului cu `EmailTemplateProcessor` folosind fix același set de variabile și se salvează rezultatul (ex: în DB/fișier) împreună cu calea către PDF.
  - Se persistă un „snapshot” JSON al datelor folosite la generare, astfel încât trimiterea ulterioară să refolosească exact aceleași valori.
  - Se loghează în jurnal rezultatul fiecărei generări (reușită/eroare) cu variabile lipsă dacă există.

---

## Step 4: Închiderea sesiunii și înghețarea (freeze) snapshot-ului
- **Scop:** Sesiunea se finalizează, se marchează ca "închisă" și se îngheață setul de date generat la Step 3.
- **Fișiere implicate:**
  - `backend/src/services/session.service.ts`
  - `backend/src/services/email.service.ts`
  - `backend/src/services/template.processor.sqlite.ts`
- **Funcții cheie:**
  - `closeConfirmareSoldSession(sessionId)`
  - `prepareEmailForPartner(partnerData, pdfPath)` (refolosește conținutul pregenereat sau atașează PDF-urile)
- **Detalii:**
  - Sesiunea este marcată ca finalizată („frozen snapshot”).
  - Nu se mai recalculează variabile; email-urile vor folosi conținutul pregenereat la Step 3 și atașamentele existente.
  - Opțional, dacă au existat corecții manuale, se poate re-rula pre-generarea doar pentru partenerii afectați înainte de închidere.

---

## Step 5: Trimiterea emailurilor și raportare
- **Scop:** Emailurile sunt trimise partenerilor, iar rezultatele sunt raportate.
- **Fișiere implicate:**
  - `backend/src/services/email.service.ts`
  - `backend/src/services/reporting.service.ts`
- **Funcții cheie:**
  - `sendEmailToPartner(emailData)` (folosește corpul pregenereat + PDF-urile generate la Step 3)
  - `generateConfirmationReport(sessionId)`
- **Detalii:**
  - Se trimit emailurile folosind conținutul și atașamentele pregătite anterior; nu se mai fac înlocuiri de variabile aici (decât dacă explicit se cere re-randare din snapshot).
  - Se colectează și se raportează rezultatele (trimise, eșuate, retry etc.).

---

## Observații importante
- **Fail-fast la Step 3:** dacă orice variabilă definită în `VariabileSabloane` e goală în contextul șablonului sau rămâne `{TOKEN}`/`[TOKEN]` neînlocuit, generarea pentru partener este marcată ca eșec și se oprește fluxul pentru acel partener. Trimiterea (Step 5) folosește doar conținut care a trecut validarea.
- **Consistență DOCX/email:** înlocuirea pentru DOCX/PDF și pre-generarea emailurilor se fac la Step 3 din același snapshot de date; Step 5 doar re-folosește conținutul validat.
- **Scalare loturi (ex: 40 parteneri):** procesarea rulează în batch-uri (ex: 5–10 simultan) cu progres și retry; atașamentele sunt pregătite la Step 3, iar la Step 5 se face doar trimiterea O(n).
- **Debugging:** folosiți log-urile din `template.processor.sqlite.ts` și rapoartele Step 3 pentru a identifica variabilele lipsă; instanțele eșuate trebuie remediate și regenerate înainte de Step 5.

---

## Schemă sumarizată

```
[Step 1] Selectare parteneri
      |
[Step 2] Extrage și validează solduri
      |
[Step 3] Generează DOCX/PDF + pregenerează corp email + jurnal (creează snapshot)
      |
[Step 4] Închide sesiune (îngheață snapshot) + pregătește coada de trimitere
      |
[Step 5] Trimite emailuri (refolosește conținutul pregenereat) + raportare
```

---

Dacă ai nevoie de detalii suplimentare pe un anumit pas sau vrei să vezi codul exact pentru o funcție, spune-mi!

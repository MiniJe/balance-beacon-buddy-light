# Index Documentație

Lista principală a documentelor din proiect pentru orientare rapidă.

## Arhitectură și Setup
- README.md – Prezentare generală proiect
- UPGRADE.md – Note upgrade / migrare
- SETUP_FINAL_SUCCESS.md – Confirmare setup final
- DEPLOYMENT.md – Ghid deployment
- deploy.sh / deploy.bat – Scripturi deployment
- docker-compose.yml – Orchestrare servicii

## Backend
- TABELE_SQL.md – Structura tabele principale
- analyze-tables.js / check-tables.js – Scripturi verificare DB
- REPORTS_AZURE_SQL_INTEGRATION.md – Integrare Azure SQL
- AZURE_SQL_VERIFICATION_GUIDE.md – Pași verificare Azure SQL
- STRUCTURĂ_APLICAȚIE.md – Structură aplicație
- STANDARDIZARE_API.md – Note standardizare API

## Workflow / Procese
- PROIECT_COMPLET.md – Roadmap / overview
- IMPLEMENTATION_SUMMARY.md – Rezumat implementări
- LISTA_COMPLETARI_VIITOARE.md – Backlog viitor
- PLAN_MAINE.md – Task-uri imediate
- FINALIZARE_TIMP.md – Sincronizare timp execuție
- TIMEZONE_STATUS_FINAL.md – Status timezone

## Funcționalități Parteneri & Cereri
- FUNCȚII.md – Funcții implementate
- FUNCȚII_LIPSESC.md – Funcții lipsă
- GHID_IMPLEMENTARE_SISTEM_PERMISIUNI.md – Sistem permisiuni
- SISTEM_PERMISIUNI_ACTUALIZAT.md / SISTEM_PERMISIUNI_GRANULARE.md – Evoluții permisiuni
- COMPANII_SORTARE_FILTRARE.md – Sortare & filtrare companii
- MULTIPLICATE.md – Tratare duplicate
- SOLUTIE_PARTENER_LIPSA.md – Caz partener lipsă
- MODIFICARI_DATE_REALE_EMAILURI.md – Ajustări emailuri reale

## Template & Generare Documente
- README_TEMPLATES_PLACEHOLDERS.md – Placeholder templates
- TEMPLATE_FIXES_SUMMARY.md – Corecții template
- GENERARE.md – Ghid generare documente
- STEP3_BLOCARE_PDF_NESEMNAT.md – Blocare PDF nesemnat
- advanced_pdf_generator.py – Generator avansat (backend/scripts)
- convert_docx_to_pdf.py – Conversie DOCX->PDF
- extract_placeholders.py – Extrage placeholder-e

## Email & Tracking
- EMAIL_TRACKING_README.md – Tracking email
- verify-jurnal-email.ts – Utilitar verificare jurnal
- DEBUGGING_DISCREPANTA_EMAILURI.md – Debug discrepanțe
- Jurnal / audit: clear_journal_tables.sql, add_reminder_settings_columns.*

## Securitate & Audit
- AUDIT_HASHURI_PDF.md – Audit hash PDF
- activate_azure_system.sql – Activare componente Azure
- fix_missing_column_azure.sql – Fix coloane

## Alte Documente Analitice
- ANALIZĂ.md – Analiză generală
- ANALIZĂ_COMPARATIVĂ_WORKFLOW_DOCUMENTE.md – Analiză comparativă workflow
- FILTRU_CONFIRMARE_IMPLEMENTAT.md – Filtru confirmare
- PROBLEME_REZOLVATE_COMPANII.md – Probleme rezolvate

## Diverse
- SETUP_FINAL_SUCCESS.md – Confirmare configurare
- start-app.ps1 / start.ps1 – Scripturi pornire
- extensii.txt – Extensii recomandate VS Code

## Sugestii Organizare Viitoare
- Mutare scripturi auxiliare într-un folder `tools/`
- Unificare doc „permisiuni” într-un singur ghid
- Introducere docs pentru fluxurile Sold vs Cereri într-o diagramă comună

(Actualizează acest index când adaugi sau redenumești fișiere.)

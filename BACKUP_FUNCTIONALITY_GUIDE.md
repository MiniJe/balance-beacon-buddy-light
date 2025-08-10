# Ghid Funcționalitate Backup - Balance Beacon Buddy

## Descriere Generală

Aplicația **Balance Beacon Buddy** include acum o funcționalitate completă de backup care permite:

- **Backup-uri manuale și automate** ale bazei de date și fișierelor
- **Configurare flexibilă** a locațiilor de backup prin tab-ul "Foldere"
- **Testare funcționalitate** înainte de crearea backup-urilor
- **Monitorizare status** backup-uri cu istoricul complet
- **Backup local și cloud** (Azure Blob Storage opțional)

## Funcționalități Principale

### 1. Configurare Locație Backup

```
Setări → Tab "Foldere" → Camp "Backup Path"
```

- Se poate configura orice folder local pentru backup-uri
- Folderul se creează automat dacă nu există
- Setările se salvează în baza de date

### 2. Tab Backup & Securitate

#### Setări Available:
- **Backup automat zilnic**: Activează/dezactivează backup-urile zilnice la ora configurată
- **Backup în cloud**: Salvează și în Azure Blob Storage (dacă este configurat)
- **Notificări email**: Trimite notificări email pentru backup-uri

#### Acțiuni Disponibile:
- **Creează backup manual**: Creează backup complet imediat
- **Testează backup**: Verifică toate componentele înainte de backup
- **Reîmprospătează**: Încarcă din nou lista de backup-uri

### 3. Funcții Backend Implementate

#### API Endpoints:

```
GET    /api/backup/settings          # Obține setările de backup
PUT    /api/backup/settings          # Actualizează setările de backup
POST   /api/backup/create             # Creează backup manual complet
POST   /api/backup/test               # Testează funcționalitatea backup
GET    /api/backup/list               # Listează backup-urile disponibile
GET    /api/backup/download/:id       # Descarcă/accesează backup specific
```

#### Backup Complet Include:
1. **SQL Data**: Toate tabelele importante (Contabili, Parteneri, SetariCompanie, Utilizatori)
2. **Fișiere Locale**: Sabloane, logos, cereri de confirmare, cereri semnate
3. **Azure Blobs**: Fișierele din Azure Blob Storage (opțional)

### 4. Structura Backup-ului Local

```
[BackupPath]/backup-[timestamp]/
├── sql-data/
│   ├── contabili.json
│   ├── parteneri.json
│   ├── setaricompanie.json
│   └── utilizatori.json
├── local-files/
│   ├── sabloane/
│   ├── logos/
│   ├── cereri-confirmare/
│   └── cereri-semnate/
└── manifest.json
```

### 5. Test Backup

Funcția de test verifică:
- **Accesul la folderul local** configurat pentru backup
- **Conectivitatea la Azure Blob Storage** (dacă este configurat)
- **Conectivitatea la baza de date** SQL

## Implementare Tehnică

### Frontend (React + TypeScript)
- **BackupTab.tsx**: Componenta principală cu UI pentru backup
- **useToast**: Pentru notificări utilizator
- **API Integration**: Apeluri către endpoint-urile backend

### Backend (Express + TypeScript)
- **BackupController**: Gestionează toate operațiunile de backup
- **SetariBackupService**: Serviciu pentru logs backup în baza de date
- **FolderSettingsService**: Gestionează configurarea folder-urilor
- **Azure Integration**: Backup către Azure Blob Storage (opțional)

### Baza de Date
- **SetariBackup**: Istoric toate backup-urile create
- **SetariFoldere**: Configurarea path-urilor pentru backup

## Utilizare Practică

### Pas 1: Configurare
1. Accesează **Setări → Foldere**
2. Configurează **Backup Path** (ex: `C:\BackupBalanceBeacon`)
3. Salvează setările

### Pas 2: Test
1. Accesează **Setări → Backup & Securitate**
2. Apasă **"Testează backup"**
3. Verifică că toate testele trec cu succes

### Pas 3: Backup Manual
1. Apasă **"Creează backup manual"**
2. Așteaptă confirmarea de succes
3. Verifică folder-ul configurat pentru backup-ul creat

### Pas 4: Monitorizare
1. Lista **"Backup-uri recente"** arată toate backup-urile
2. Fiecare backup afișează: data, tipul, dimensiunea, statusul
3. Butonul **"Descarcă"** permite accesul la backup

## Beneficii

✅ **Securitate Datelor**: Backup complet al bazei de date și fișierelor
✅ **Flexibilitate**: Configurare locație backup personalizată  
✅ **Monitoring**: Istoric complet și status real-time
✅ **Testare**: Verificare funcționalitate înainte de backup
✅ **Cloud Ready**: Suport pentru Azure Blob Storage
✅ **Automatizare**: Opțiune backup zilnic automat
✅ **User Experience**: Interface intuitivă cu notificări clare

## Notă Tehnică

Implementarea folosește:
- **fs-extra** pentru operații fișiere avansate
- **path** pentru gestionarea path-urilor cross-platform
- **SetariBackupService** pentru tracking-ul backup-urilor în DB
- **FolderSettingsService** pentru configurarea dinamică a folder-urilor
- **ApiResponseHelper** pentru răspunsuri API consistente

Funcționalitatea este complet integrată în sistemul de setări existent și respectă arhitectura MVC a aplicației.

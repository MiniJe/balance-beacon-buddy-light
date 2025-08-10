# Structura Aplicației Balance    └── settings/
       ├── BackupTab.tsx
       ├── CompanyTab.tsx
       ├── ContabilFormDialog.tsx
       ├── ContabiliTab.tsx
       ├── EmailTab.tsx
       ├── FolderTab.tsx
       └── AdvancedSettingsTab.tsx (COMBINAT: NotificationsTab + GlobalAdvancedSettingsTab)ddy Light

## Arhitectura Generală

```
balance-beacon-buddy-light/
├── frontend/ (React + TypeScript + Vite)
├── backend/ (Node.js + Express + SQLite)
├── docker-compose.yml
└── fișiere de configurare
```

## FRONTEND Structure

### Componente Principale
```
frontend/src/
├── components/
│   ├── ui/ (shadcn/ui components)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   └── ...
│   ├── partners/
│   │   ├── PartnerFormDialog.tsx
│   │   └── ...
│   ├── requests/
│   │   └── ...
│   └── settings/
│       ├── BackupTab.tsx
│       ├── CompanyTab.tsx
│       ├── ContabilFormDialog.tsx
│       ├── ContabiliTab.tsx
│       ├── EmailTab.tsx
│       ├── FolderTab.tsx
│       ├── NotificationsTab.tsx (EXISTĂ dar nu se găsește)
│       └── GlobalAdvancedSettingsTab.tsx (EXISTĂ dar nu se găsește)
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Partners.tsx
│   ├── Requests.tsx
│   ├── Settings.tsx
│   └── ...
├── hooks/
│   ├── useAuth.ts
│   ├── usePartnersManagement.ts
│   ├── useNotificationSettings.ts
│   ├── useFolderSettings.ts
│   └── ...
├── services/
│   ├── api.ts
│   ├── partener.service.ts
│   ├── auth.service.ts
│   └── ...
└── contexts/
    └── AuthContext.tsx
```

## BACKEND Structure

### Controlere (Controllers)
```
backend/src/controllers/
├── auth.controller.ts
├── backup.controller.ts (AZURE - NU SE FOLOSEȘTE)
├── simpleBackup.controller.ts (SQLite - SE FOLOSEȘTE)
├── company.settings.controller.ts
├── email.controller.sqlite.ts
├── email.settings.controller.ts
├── folder.settings.controller.ts
├── reminder.settings.controller.ts
├── partener.controller.ts
└── ...
```

### Rute (Routes)
```
backend/src/routes/
├── auth.routes.ts
├── backup.routes.ts (REPARAT - folosește simpleBackupController)
├── company.settings.routes.ts
├── email.settings.routes.ts
├── folder.settings.routes.ts
├── reminder.settings.routes.ts
├── partener.routes.ts
└── ...
```

### Servicii (Services)
```
backend/src/services/
├── auth.service.ts
├── backup.service.ts
├── company.settings.service.ts
├── email.service.ts
├── folder.settings.service.ts
├── partener.service.ts
└── ...
```

### Middleware
```
backend/src/middleware/
├── auth.middleware.ts
├── upload.middleware.ts
└── ...
```

## Schema Logică a Acțiunilor

### 1. AUTENTIFICARE
```
Frontend: Login.tsx
    ↓
Backend: auth.routes.ts → auth.controller.ts → auth.service.ts
    ↓
Baza de date: users table
    ↓
Răspuns: JWT token
```

### 2. DASHBOARD
```
Frontend: Dashboard.tsx
    ↓
Backend: Multiple API calls pentru statistici
    ↓
Baza de date: Multiple tables
    ↓
Răspuns: Date dashboard
```

### 3. PARTENERI
```
Frontend: Partners.tsx + PartnerFormDialog.tsx
    ↓
Backend: partener.routes.ts → partener.controller.ts → partener.service.ts
    ↓
Baza de date: parteneri table
    ↓
Răspuns: Lista parteneri / Confirmare salvare
```

### 4. CERERI/DOCUMENTЕ
```
Frontend: Requests.tsx
    ↓
Backend: cereri.routes.ts → cereri.controller.ts
    ↓
Baza de date: cereri + documente tables
    ↓
Răspuns: Lista cereri + status procesare
```

### 5. SETĂRI
```
Frontend: Settings.tsx cu următoarele tab-uri:
├── EmailTab.tsx → /api/email-settings
├── CompanyTab.tsx → /api/company-settings
├── FolderTab.tsx → /api/folder-settings
├── AdvancedSettingsTab.tsx → (Combinat: Notificări + Setări Avansate)
│   ├── Sub-tab Notificări → /api/notification-settings
│   └── Sub-tab Setări Avansate → /api/reminders/settings
├── BackupTab.tsx → /api/backup (REPARAT)
└── ContabiliTab.tsx → /api/users (doar pentru master)
```

### 6. BACKUP (REPARATĂ)
```
Frontend: BackupTab.tsx → fetch('/api/backup')
    ↓
Backend: backup.routes.ts → simpleBackupController (NU BackupController)
    ↓
SQLite: Backup local în fișier .db
    ↓
Răspuns: Link download backup
```

## Probleme Identificate

### ✅ REZOLVATE:
1. **backup.routes.ts** - Schimbat de la BackupController la simpleBackupController
2. **email.controller.sqlite.ts** - Corectat metodele: sendEmailWithPlainPassword, updateEmailPassword
3. **NotificationsTab.tsx & GlobalAdvancedSettingsTab.tsx** - Combinate în AdvancedSettingsTab.tsx cu sub-taburi
4. **CompanyTab.tsx** - Eliminat datele mock, folosește interfața SetariCompanie din backend

### ✅ COMPLET REZOLVATE:
- Toate erorile de build și import au fost corectate
- Aplicația se compilează cu succes
- Structura componentelor optimizată și curățată

### 🔍 INVESTIGARE NECESARĂ:
1. Verificare duplicat fișiere în backend/src/services/ (company.settings.service.ts apare de 2 ori)
2. Verificare fișiere nefolosite din migrația Azure → SQLite
3. Verificare dependențe care nu se mai folosesc

## Fluxul de Date Principal

```
1. User Login → JWT Token
2. Frontend Router → Pagina corespunzătoare
3. Componenta → Service call → Backend API
4. Backend → Middleware (auth) → Controller → Service → Database
5. Response → Frontend → Update UI
```

## Fișiere de Configurare Importante

```
├── frontend/
│   ├── package.json (dependențe React)
│   ├── vite.config.ts (configurare build)
│   ├── tailwind.config.ts (stilizare)
│   └── tsconfig.json (TypeScript)
├── backend/
│   ├── package.json (dependențe Node.js)
│   ├── tsconfig.json (TypeScript)
│   └── src/app.ts (aplicația principală)
└── docker-compose.yml (containerizare)
```

## Next Steps pentru Debugare

1. ✅ Rezolvă problema import-urilor NotificationsTab și GlobalAdvancedSettingsTab
2. 🔧 Corectează endpoint-ul din CompanyTab.tsx
3. 🧹 Curăță fișierele duplicate din backend
4. 🧪 Testează funcționalitatea de backup
5. 📝 Verifică toate endpoint-urile API

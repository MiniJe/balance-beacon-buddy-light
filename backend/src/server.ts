import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { authMiddleware, roleMiddleware } from './middleware/auth.middleware';
import authUnifiedRoutes from './routes/auth.unified.routes';
import databaseRoutes from './routes/database.routes';
import emailRoutes from './routes/email.routes';
import emailSettingsRoutes from './routes/email.settings.routes';
import partenerRoutes from './routes/partener.routes';
import pdfRoutes from './routes/pdf.routes';
import contabilRoutes from './routes/contabil.routes';
import blobRoutes from './routes/blob.routes';
import backupRoutes from './routes/backup.routes';
import sesiuniRoutes from './routes/sesiuni.routes';
import permissionsRoutes from './routes/permissions.routes';
import jurnalEmailRoutes from './routes/jurnal.email.routes';
import jurnalDocumenteEmiseRoutes from './routes/jurnal.documente.emise.routes';
import jurnalCereriConfirmareRoutes from './routes/jurnal.cereri.confirmare.routes';
import cereriConfirmareRoutes from './routes/cereri.confirmare.routes';
import advancedCereriConfirmareRoutes from './routes/advanced.cereri.confirmare.routes';
import templateRoutes from './routes/template.routes';
import emailMonitorRoutes from './routes/email-monitor.routes';
import emailTrackingRoutes from './routes/email-tracking.routes';
import autoReminderRoutes from './routes/auto-reminder.routes';
import reminderSettingsRoutes from './routes/reminder.settings.routes';
import auditRoutes from './routes/audit.routes'; // ✅ ADĂUGAT: rute pentru audit
import uploadRoutes from './routes/upload.routes'; // ✅ ADĂUGAT: rute pentru upload fișiere semnate
import { initializeDatabase } from './config/sqlite';
import { emailService } from './services/email.service';
import { healthCheck, readinessCheck } from './controllers/health.controller';

config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true
}));
app.use(express.json());

// Inițializare conexiune la baza de date SQLite
initializeDatabase()
    .then(() => {
        console.log('✅ Baza de date SQLite conectată');
        // Inițializează serviciul de email după conectarea la BD
        return emailService.initialize();
    })
    .then(() => {
        console.log('✅ Serviciul de email inițializat');
    })
    .catch(console.error);

// Rute
app.use('/api/auth-unified', authUnifiedRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/email-settings', emailSettingsRoutes);
app.use('/api/parteneri', partenerRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/contabili', contabilRoutes);
app.use('/api/storage', blobRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/sesiuni', sesiuniRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/jurnal-email', jurnalEmailRoutes);
app.use('/api/jurnal-documente-emise', jurnalDocumenteEmiseRoutes);
app.use('/api/jurnal-cereri-confirmare', jurnalCereriConfirmareRoutes);
app.use('/api/cereri-confirmare', cereriConfirmareRoutes);
app.use('/api/advanced-cereri-confirmare', advancedCereriConfirmareRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/email-monitor', emailMonitorRoutes);
app.use('/api/email-tracking', emailTrackingRoutes);
app.use('/api/auto-reminder', autoReminderRoutes);
app.use('/api/reminders', reminderSettingsRoutes);
app.use('/api/audit', auditRoutes); // ✅ ADĂUGAT: rute pentru audit PDF și hash-uri
app.use('/api/upload', uploadRoutes); // ✅ ADĂUGAT: rute pentru upload fișiere semnate

// Rută de test pentru debugging autentificare
app.get('/api/test-auth', authMiddleware, roleMiddleware(['CONTABIL', 'MASTER']), (req: any, res) => {
  res.json({ 
    success: true, 
    message: 'Autentificare reușită!',
    user: req.user 
  });
});

// Health check endpoints pentru deployment și monitoring
app.get('/health', healthCheck);
app.get('/ready', readinessCheck);

// Rută de test
app.get('/', (req, res) => {
  res.json({ message: 'Balance Beacon Buddy API' });
});

// Pornire server
app.listen(PORT, () => {
  console.log(`Serverul rulează pe portul ${PORT}`);
});

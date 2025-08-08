import { Router } from 'express';
import { cereriConfirmareOrchestratorService } from '../services/cereri.confirmare.orchestrator.service';

const router = Router();

/**
 * GET /api/audit/pdf-nesemnate
 * Auditează toate fișierele PDF pentru a detecta cele care nu au fost semnate digital
 */
router.get('/pdf-nesemnate', async (req, res) => {
    try {
        console.log('🔍 API: Începere audit PDF nesemnate');
        
        const idSesiune = req.query.idSesiune as string | undefined;
        
        const rezultatAudit = await cereriConfirmareOrchestratorService.auditFisierePDFNesemnate(idSesiune);
        
        console.log('✅ API: Audit PDF finalizat cu succes');
        res.json({
            success: true,
            data: rezultatAudit,
            message: 'Audit finalizat cu succes'
        });
        
    } catch (error) {
        console.error('❌ API: Eroare în audit PDF:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Eroare necunoscută',
            message: 'Eroare la executarea auditului PDF'
        });
    }
});

/**
 * GET /api/audit/hash-complet/:hashOriginal/:hashSemnaturizat
 * Efectuează audit complet de hash-uri pentru un document specific
 */
router.get('/hash-complet/:hashOriginal/:hashSemnaturizat', async (req, res) => {
    try {
        const { hashOriginal, hashSemnaturizat } = req.params;
        const hashPartenerReturnat = req.query.hashPartener as string | undefined;
        
        console.log(`🔍 API: Audit hash complet pentru ${hashOriginal.substring(0, 8)}...`);
        
        const rezultatAudit = await cereriConfirmareOrchestratorService.auditHashuriComplet(
            hashOriginal, 
            hashSemnaturizat, 
            hashPartenerReturnat
        );
        
        console.log('✅ API: Audit hash complet finalizat');
        res.json({
            success: true,
            data: rezultatAudit,
            message: 'Audit hash finalizat cu succes'
        });
        
    } catch (error) {
        console.error('❌ API: Eroare în audit hash:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Eroare necunoscută',
            message: 'Eroare la executarea auditului hash'
        });
    }
});

/**
 * GET /api/audit/statistici-semnatura
 * Returnează statistici generale despre starea semnăturilor digitale în sistem
 */
router.get('/statistici-semnatura', async (req, res) => {
    try {
        console.log('📊 API: Generare statistici semnătură digitală');
        
        const rezultatAudit = await cereriConfirmareOrchestratorService.auditFisierePDFNesemnate();
        
        const statistici = {
            totalEmailuri: rezultatAudit.totalEmailuri,
            fisiereSemnate: rezultatAudit.fisiereSemnate,
            fisiereNesemnate: rezultatAudit.fisiereNesemnate,
            fisiereNeidentificate: rezultatAudit.fisiereNeidentificate,
            procentajSemnare: rezultatAudit.totalEmailuri > 0 
                ? Math.round((rezultatAudit.fisiereSemnate / rezultatAudit.totalEmailuri) * 100) 
                : 0,
            procentajNesemnare: rezultatAudit.totalEmailuri > 0 
                ? Math.round((rezultatAudit.fisiereNesemnate / rezultatAudit.totalEmailuri) * 100) 
                : 0,
            recomandat: rezultatAudit.recomandat,
            ultimulAudit: new Date().toISOString()
        };
        
        console.log('✅ API: Statistici generate cu succes');
        res.json({
            success: true,
            data: statistici,
            message: 'Statistici generate cu succes'
        });
        
    } catch (error) {
        console.error('❌ API: Eroare în generarea statisticilor:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Eroare necunoscută',
            message: 'Eroare la generarea statisticilor'
        });
    }
});

/**
 * GET /api/audit/configurare-securitate
 * Returnează configurația curentă pentru blocarea fișierelor nesemnate
 */
router.get('/configurare-securitate', async (req, res) => {
    try {
        console.log('🔧 API: Obținere configurare securitate');
        
        const configurare = {
            blockUnsignedFiles: process.env.BLOCK_UNSIGNED_PDF_FILES !== 'false',
            allowUnsignedInDevelopment: process.env.NODE_ENV === 'development' && process.env.ALLOW_UNSIGNED_IN_DEV === 'true',
            currentEnvironment: process.env.NODE_ENV || 'production',
            isBlocking: (process.env.BLOCK_UNSIGNED_PDF_FILES !== 'false') && 
                       !(process.env.NODE_ENV === 'development' && process.env.ALLOW_UNSIGNED_IN_DEV === 'true'),
            recomandat: 'În producție, blocarea fișierelor nesemnate trebuie activată pentru securitate maximă'
        };
        
        console.log('✅ API: Configurare securitate obținută');
        res.json({
            success: true,
            data: configurare,
            message: 'Configurare securitate obținută cu succes'
        });
        
    } catch (error) {
        console.error('❌ API: Eroare în obținerea configurării:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Eroare necunoscută',
            message: 'Eroare la obținerea configurării de securitate'
        });
    }
});

export default router;

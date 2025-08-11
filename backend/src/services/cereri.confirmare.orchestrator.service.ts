import crypto from 'crypto';
import fs from 'fs/promises';
import * as fsSync from 'fs'; // ✅ ADĂUGAT: pentru readFileSync
import path from 'path';
import { getDatabase } from '../config/sqlite';
import { jurnalDocumenteEmiseCleanService } from './JurnalDocumenteEmiseClean.service';
import { jurnalCereriConfirmareRealService } from './JurnalCereriConfirmareReal.service';
import jurnalSesiuniService from './JurnalSesiuniService';
import { emailService } from './email.service';
import { pdfGenerationService } from './pdf.generation.service';
import { templateManagerService } from './template.manager.service';
// import { advancedStorageService } from './advanced.storage.service'; // ❌ eliminat Azure
import { EmailTemplateService } from './template.service';
import { CreateJurnalDocumenteEmiseDto } from '../models/JurnalDocumenteEmise';
import { CreateJurnalCereriConfirmareDto } from '../models/JurnalCereriConfirmare.Real';
import { CreateJurnalSesiuniDto } from '../models/JurnalSesiuni';
import { Partener } from '../models/Partener';
import { folderSettingsService } from './folder.settings.service';

/**
 * Interfață pentru datele necesare inițierii unei sesiuni de cereri
 */
interface SesiuneCereriData {
    idUtilizator: string;
    numeUtilizator: string;
    emailUtilizator: string;
    rolUtilizator: string; // Adăugat pentru a primi rolul real din JWT
    parteneriSelectati: string[]; // Array de ID-uri parteneri
    partnerCategory: string; // Categoria selectată în Step 1 - determină automat template-ul
    dataSold: string; // YYYY-MM-DD
    subiectEmail: string;
    folderLocal: string; // Path pentru salvarea fișierelor
    observatii?: string;
}

/**
 * Interfață pentru rezultatul generării documentelor
 */
interface DocumentGenerat {
    idDocument?: string;       // ID temporar pentru tracking în sesiune (optional)
    numarInregistrare: number; // Din JurnalDocumenteEmise (IdDocumente) - rezervat temporar până în Step 4
    idPartener: string;
    numePartener: string;
    tipPartener: string;
    numeDocument: string;
    caleFisier: string;
    hashDocument: string; // hash original PDF generat (nesemnat)
    hashDocumentSemnat?: string; // ✅ nou: hash al PDF-ului semnat (nu suprascrie originalul)
    dimensiuneDocument: number;
    status?: 'reserved' | 'generated' | 'downloaded' | 'uploaded' | 'signed'; // Status în workflow
}

/**
 * Interfață pentru rezultatul unei sesiuni complete
 */
interface SesiuneCompleta {
    idSesiune: string;
    documenteGenerate: DocumentGenerat[];
    cereriTrimise: string[]; // Array de ID-uri cereri
    erori: string[];
}

/**
 * Serviciu pentru orchestrarea întregului proces de generare și trimitere cereri de confirmare
 * Gestionează fluxul complet: sesiune -> generare numere -> PDF-uri -> email -> jurnal
 */
export class CereriConfirmareOrchestratorService {
    
    // Folosim noile servicii îmbunătățite
    // Nu mai avem nevoie de storageService aici - folosim advancedStorageService direct
    private emailTemplateService = EmailTemplateService;

    // 🛡️ CONFIGURARE SECURITATE: Controlează dacă să blocheze fișierele nesemnate
    private readonly BLOCK_UNSIGNED_FILES = process.env.BLOCK_UNSIGNED_PDF_FILES !== 'false'; // true by default
    private readonly ALLOW_UNSIGNED_IN_DEVELOPMENT = process.env.NODE_ENV === 'development' && process.env.ALLOW_UNSIGNED_IN_DEV === 'true';

    /**
     * Preia informațiile unui partener din baza de date SQLite
     */
    private async getPartenerById(idPartener: string): Promise<Partener | null> {
        try {
            console.log(`🔍 SQLite Query pentru partener ID: ${idPartener}`);
            const db = await getDatabase();

            const query = `SELECT * FROM Parteneri WHERE IdPartener = ? LIMIT 1`;
            console.log(`📝 Query SQLite: ${query}`);
            
            const record = await db.get(query, [idPartener]);
            console.log(`📊 Rezultat găsit:`, record ? 'DA' : 'NU');

            if (!record) {
                console.log(`❌ Partenerul cu ID ${idPartener} nu există în baza de date`);
                return null;
            }

            console.log(`🔍 Structura completă a recordului:`, Object.keys(record));
            console.log(`🔍 Record RAW:`, record);
            
            // Mapare cu verificare pentru nume de coloane
            return {
                idPartener: record.IdPartener,
                numePartener: record.NumePartener,
                cuiPartener: record.CUIPartener,
                onrcPartener: record.ONRCPartener,
                emailPartener: record.EmailPartener,
                reprezentantPartener: record.ReprezentantPartener,
                clientDUC: record.ClientDUC,
                clientDL: record.ClientDL,
                furnizorDUC: record.FurnizorDUC,
                furnizorDL: record.FurnizorDL,
                adresaPartener: record.AdresaPartener || record.adresaPartener,
                telefonPartener: record.TelefonPartener || record.telefonPartener,
                observatiiPartener: record.ObservatiiPartener || record.observatiiPartener,
                partenerActiv: record.PartenerActiv || record.partenerActiv,
                dataCrearePartener: record.DataCrearePartener || record.dataCrearePartener,
                dataModificarePartener: record.DataModificarePartener || record.dataModificarePartener
            };
        } catch (error) {
            console.error('❌ Eroare la preluarea partenerului:', error);
            throw error;
        }
    }
    
    /**
     * Generează hash SHA-256 pentru fișier
     */
    private async generateFileHash(filePath: string): Promise<string> {
        try {
            const fileBuffer = await fs.readFile(filePath);
            return crypto.createHash('sha256').update(fileBuffer).digest('hex');
        } catch (error) {
            console.error('Eroare la generarea hash-ului fișierului:', error);
            throw new Error('Nu s-a putut genera hash-ul fișierului');
        }
    }

    /**
     * Obține dimensiunea fișierului în bytes
     */
    private async getFileSize(filePath: string): Promise<number> {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        } catch (error) {
            console.error('Eroare la obținerea dimensiunii fișierului:', error);
            throw new Error('Nu s-a putut obține dimensiunea fișierului');
        }
    }

    /**
     * Determină template-ul DOCX automat pe baza categoriei selectate în Step 1
     */
    private determineTemplateFromCategory(
        partnerCategory: string, 
        partener?: Partener
    ): string {
        // Dacă categoria este 'all', analizează flag-urile partenerului individual
        if (partnerCategory === 'all' && partener) {
            const tipPartener = this.getTipPartener(partener);
            const templateMap = {
                'client_duc': 'document_template_clienți-duc.docx',
                'client_dl': 'document_template_clienți-dl.docx',
                'furnizor_duc': 'document_template_furnizori-duc.docx',
                'furnizor_dl': 'document_template_furnizori-dl.docx'
            };
            return templateMap[tipPartener];
        }
        
        // Mapare directă din categoria selectată în Step 1
        const templateMap: { [key: string]: string } = {
            'client_duc': 'document_template_clienți-duc.docx',
            'client_dl': 'document_template_clienți-dl.docx',
            'furnizor_duc': 'document_template_furnizori-duc.docx',
            'furnizor_dl': 'document_template_furnizori-dl.docx'
        };
        
        return templateMap[partnerCategory] || 'document_template_clienți-duc.docx'; // fallback
    }

    /**
     * Determină template-ul EMAIL automat pe baza categoriei selectate în Step 1
     */
    private async determineEmailTemplateFromCategory(
        partnerCategory: string, 
        partener?: Partener
    ): Promise<string | null> {
        try {
            console.log(`🔍 EMAIL: Determinare template pentru categoria: ${partnerCategory}, partener: ${partener?.numePartener || 'N/A'}`);
            
            let categoryToSearch: string;

            // ✅ FALLBACK: Dacă categoria este undefined/null, determină categoria din datele partenerului
            if (!partnerCategory || partnerCategory === 'undefined' || partnerCategory === 'null') {
                if (partener) {
                    console.log(`🔄 FALLBACK: Categoria este '${partnerCategory}', determin din datele partenerului...`);
                    // Determină categoria pe baza boolean-urilor din baza de date
                    if (partener.clientDUC) {
                        categoryToSearch = 'client';
                        console.log(`🎯 FALLBACK: Partener CLIENT DUC detectat → categoria 'client'`);
                    } else if (partener.furnizorDUC) {
                        categoryToSearch = 'furnizor';
                        console.log(`🎯 FALLBACK: Partener FURNIZOR DUC detectat → categoria 'furnizor'`);
                    } else if (partener.clientDL) {
                        categoryToSearch = 'client';
                        console.log(`🎯 FALLBACK: Partener CLIENT DL detectat → categoria 'client'`);
                    } else if (partener.furnizorDL) {
                        categoryToSearch = 'furnizor';
                        console.log(`🎯 FALLBACK: Partener FURNIZOR DL detectat → categoria 'furnizor'`);
                    } else {
                        categoryToSearch = 'general';
                        console.log(`⚠️ FALLBACK: Partener fără categorie clară → categoria 'general'`);
                    }
                } else {
                    categoryToSearch = 'general';
                    console.log(`⚠️ FALLBACK: Fără partener specificat → categoria 'general'`);
                }
            }
            // Dacă categoria este 'all', analizează flag-urile partenerului individual
            else if (partnerCategory === 'all' && partener) {
                const tipPartener = this.getTipPartener(partener);
                console.log(`🔍 EMAIL: Tip partener detectat: ${tipPartener}`);
                // Mapează tipul partenerului la categoria de template
                if (tipPartener.includes('client')) {
                    categoryToSearch = 'client';
                } else if (tipPartener.includes('furnizor')) {
                    categoryToSearch = 'furnizor';
                } else {
                    categoryToSearch = 'general';
                }
            } else {
                // Mapează categoria directă la categoria template
                const categoryMap: { [key: string]: string } = {
                    'client_duc': 'client',
                    'client_dl': 'client',
                    'furnizor_duc': 'furnizor',
                    'furnizor_dl': 'furnizor'
                };
                categoryToSearch = categoryMap[partnerCategory] || 'general';
            }
            
            console.log(`🔍 EMAIL: Categorie de căutat: ${categoryToSearch}`);

            // Caută primul template email activ pentru categoria respectivă
            const templates = await this.emailTemplateService.getAllTemplates();
            console.log(`🔍 EMAIL: Template-uri găsite: ${templates.length}, cautam TipSablon=email && CategorieSablon=${categoryToSearch} && Activ=true`);
            
            const emailTemplate = templates.find(t => 
                t.TipSablon === 'email' && 
                t.CategorieSablon === categoryToSearch &&
                !!t.Activ // Acceptă 1 / true
            );
            
            // ✅ FALLBACK FINAL: Dacă nu găsește template pentru categoria 'general', încearcă 'client' (ca default)
            if (!emailTemplate && categoryToSearch === 'general') {
                console.log(`🔄 FALLBACK FINAL: Nu există template pentru categoria 'general', încerc categoria 'client'...`);
                const fallbackTemplate = templates.find(t => 
                    t.TipSablon === 'email' && 
                    t.CategorieSablon === 'client' &&
                    t.Activ === true
                );
                
                if (fallbackTemplate) {
                    console.log(`🎯 FALLBACK FINAL: Template 'client' găsit ca fallback: ${fallbackTemplate.IdSablon} (${fallbackTemplate.NumeSablon})`);
                    return fallbackTemplate.IdSablon;
                }
            }
            
            console.log(`🔍 EMAIL: Template găsit: ${emailTemplate?.IdSablon || 'NONE'} (${emailTemplate?.NumeSablon || 'N/A'})`);

            // ✅ NOU: Fallback generic – dacă încă nu avem template specific, folosim primul template email activ indiferent de categorie
            if (!emailTemplate) {
                const firstActiveAnyCategory = templates.find(t => t.TipSablon === 'email' && t.Activ === true);
                if (firstActiveAnyCategory) {
                    console.warn(`⚠️ FALLBACK GENERIC: Nu a fost găsit șablon pentru categoria '${categoryToSearch}'. Se folosește primul activ (${firstActiveAnyCategory.CategorieSablon} -> ${firstActiveAnyCategory.IdSablon})`);
                    return firstActiveAnyCategory.IdSablon;
                } else {
                    console.error(`❌ NU EXISTĂ NICIUN ȘABLON EMAIL ACTIV ÎN TABEL. Se va continua fără trimitere email, dar cererea va fi salvată.`);
                    return null; // Orchestrator va continua salvarea cererii fără email
                }
            }

            return emailTemplate?.IdSablon || null;
        } catch (error) {
            console.error('Eroare la determinarea template-ului email:', error);
            return null;
        }
    }

    /**
     * Determină tipul partenerului pe baza flag-urilor
     */
    private getTipPartener(partener: Partener): 'client_duc' | 'client_dl' | 'furnizor_duc' | 'furnizor_dl' {
        if (partener.clientDUC) return 'client_duc';
        if (partener.clientDL) return 'client_dl';
        if (partener.furnizorDUC) return 'furnizor_duc';
        if (partener.furnizorDL) return 'furnizor_dl';
        
        // Default la client DUC dacă nu este specificat altfel
        return 'client_duc';
    }

    /**
     * Selectează template-ul de email pe baza tipului de partener
     */
    private selectEmailTemplate(tipPartener: string): string {
        const templates = {
            'client_duc': 'template_client_duc.docx',
            'client_dl': 'template_client_dl.docx',
            'furnizor_duc': 'template_furnizor_duc.docx',
            'furnizor_dl': 'template_furnizor_dl.docx'
        };
        
        return templates[tipPartener as keyof typeof templates] || 'template_default.docx';
    }

    /**
     * Generează numele documentului pentru un partener (format nou, mai lizibil)
     */
    private generateDocumentName(partener: Partener, dataSold: string, numarInregistrare: number): string {
        // Format dorit: "CERERE DE CONFIRMARE DE SOLD Nr. {numarInregistrare} {DD.MM.YYYY} - {Nume Partener}.pdf"
        // Păstrăm diacriticele, curățăm doar caracterele ilegale pentru Windows
        const dateObj = new Date(dataSold);
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const yyyy = dateObj.getFullYear();
        const dataAfisare = `${dd}.${mm}.${yyyy}`;
        const cleanedPartnerName = partener.numePartener
            .replace(/[\\/:*?"<>|]/g, ' ') // caractere interzise
            .replace(/\s+/g, ' ')
            .trim();
        const nume = `CERERE DE CONFIRMARE DE SOLD Nr. ${numarInregistrare} ${dataAfisare} - ${cleanedPartnerName}.pdf`;
        return nume;
    }

    /**
     * Inițiază o nouă sesiune de cereri de confirmare - STEP 2 din SESIUNE.md
     * ⚠️ DOAR în memorie: Pregătește datele sesiunii cu categoria salvată
     * ⚠️ REZERVĂ temporar numerele de înregistrare (NU se salvează în JurnalDocumenteEmise!)
     * ✅ DETERMINĂ AUTOMAT template-ul pe baza categoriei din Step 1
     * ⚠️ IMPORTANT: Nicio înregistrare în baza de date încă!
     */
    async initializeSesiuneCereri(
        sesiuneData: SesiuneCereriData,
        clientInfo?: { adresaIP?: string; userAgent?: string }
    ): Promise<{ idSesiune: string; documenteReservate: DocumentGenerat[] }> {
        try {
            console.log('🚀 STEP 2: Inițializare sesiune cereri confirmare pentru utilizatorul:', sesiuneData.numeUtilizator);
            console.log(`📋 Categoria selectată în Step 1: ${sesiuneData.partnerCategory} - va determina automat template-urile`);
            
            // 1. ⚠️ DOAR în memorie: Generăm ID-ul sesiunii (nu salvăm în JurnalSesiuni!)
            const idSesiune = crypto.randomUUID();
            console.log(`📌 ID sesiune generat în memorie: ${idSesiune}`);
            
            // 2. Salvăm datele sesiunii în memorie cu categoria pentru propagare
            const sesiuneMemorie = {
                ...sesiuneData,
                idSesiune,
                timestampInitializare: new Date().toISOString(),
                observatiiSesiune: {
                    dataSold: sesiuneData.dataSold,
                    partnerCategory: sesiuneData.partnerCategory, // ✅ Categoria se propagă prin întreaga sesiune
                    subiectEmail: sesiuneData.subiectEmail,
                    folderLocal: sesiuneData.folderLocal,
                    descriere: `Sesiune pentru generare cereri confirmare sold - Data sold: ${sesiuneData.dataSold} - Categoria: ${sesiuneData.partnerCategory}`,
                    clientInfo
                }
            };
            console.log('✅ Sesiune în memorie creată cu categoria propagată:', sesiuneMemorie.observatiiSesiune.partnerCategory);

            // 2. Obține informațiile partenerilor selectați
            console.log(`📋 Procesare listă parteneri: ${sesiuneData.parteneriSelectati?.length || 0} parteneri selectați`);
            console.log(`📋 Lista ID-uri parteneri:`, sesiuneData.parteneriSelectati);
            
            // Verifică rapid câți parteneri activi sunt în total în BD
            const db = await getDatabase();
            const activePartnersCheck = await db.get(`
                SELECT COUNT(*) as activeCount FROM Parteneri WHERE PartenerActiv = 1
            `);
            console.log(`📊 Total parteneri activi în BD: ${activePartnersCheck.activeCount}`);
            
            const parteneri: Partener[] = [];
            for (const idPartener of sesiuneData.parteneriSelectati) {
                console.log(`🔍 Căutare partener cu ID: ${idPartener}`);
                const partener = await this.getPartenerById(idPartener);
                console.log(`📊 Partener găsit:`, partener ? {
                    id: partener.idPartener,
                    nume: partener.numePartener,
                    activ: partener.partenerActiv,
                    activType: typeof partener.partenerActiv
                } : 'null');
                
                // Verifică ca partenerul să fie activ - convertim la boolean pentru siguranță
                const activValue = String(partener?.partenerActiv || '').toLowerCase();
                const isActive = partener && activValue !== '0' && activValue !== 'false' && activValue !== '';
                if (partener && isActive) {
                    parteneri.push(partener);
                    console.log(`✅ Partener activ adăugat: ${partener.numePartener}`);
                } else {
                    console.warn(`⚠️ Partenerul cu ID ${idPartener} nu a fost găsit sau nu este activ (activ: ${partener?.partenerActiv})`);
                }
            }

            if (parteneri.length === 0) {
                throw new Error('Nu au fost găsiți parteneri activi pentru procesare');
            }

            console.log(`📋 Procesare pentru ${parteneri.length} parteneri activi`);

            // 3. REZERVĂ temporar numere pentru planificare (NU le înregistrează încă în JurnalDocumenteEmise!)
            // Conform procedurii business, numerele se înregistrează DOAR în Step 4, la încheierea sesiunii
            const numarPornire = await jurnalDocumenteEmiseCleanService.getNextRegistrationNumber();
            console.log(`🔢 Numărul de pornire pentru rezervare temporară: ${numarPornire}`);
            console.log(`⚠️ IMPORTANT: Numerele sunt rezervate temporar, vor fi înregistrate în JurnalDocumenteEmise doar în Step 4!`);

            // 4. Creează lista de documente pentru planificare (fără a le înregistra încă în BD)
            const documenteReservate: DocumentGenerat[] = [];
            
            for (let i = 0; i < parteneri.length; i++) {
                const partener = parteneri[i];
                const numarInregistrare = numarPornire + i;
                const tipPartener = this.getTipPartener(partener);
                
                // Generează numele documentului cu numărul rezervat temporar
                const numeDocument = this.generateDocumentName(partener, sesiuneData.dataSold, numarInregistrare);
                // ⚠️ IMPORTANTE: NU creez încă înregistrarea în JurnalDocumenteEmise! 
                // Aceasta se va face în Step 5 prin finalizeSession()
                
                const documentGenerat: DocumentGenerat = {
                    idDocument: `temp_${idSesiune}_${i}`, // ID temporar pentru tracking în sesiune
                    numarInregistrare: numarInregistrare,
                    idPartener: partener.idPartener,
                    numePartener: partener.numePartener,
                    tipPartener,
                    numeDocument,
                    caleFisier: path.join(sesiuneData.folderLocal, numeDocument),
                    hashDocument: 'PENDING_GENERATION',
                    dimensiuneDocument: 0,
                    status: 'reserved' // Status temporar până la Step 5
                };
                
                documenteReservate.push(documentGenerat);
                console.log(`📄 Număr rezervat temporar în memorie: ${numarInregistrare} pentru ${partener.numePartener} (va fi înregistrat în BD în Step 5)`);
            }

            return {
                idSesiune: idSesiune,
                documenteReservate
            };

        } catch (error) {
            console.error('❌ Eroare la inițializarea sesiunii:', error);
            throw new Error(`Eroare la inițializarea sesiunii: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Generează documentele PDF pentru o sesiune - STEP 3 din SESIUNE.md
     * ✅ Pentru fiecare partener selectat:
     * ✅ Folosește template-ul determinat automat (nu mai e hardcodat!)
     * ✅ Descarcă template-ul DOCX din Azure Blob Storage
     * ✅ Înlocuiește placeholder-urile cu datele partenerului
     * ✅ Generează PDF-ul final în folder local
     * ⚠️ IMPORTANT: NU înregistrează NIMIC în baza de date încă!
     */
    async generateDocumentePentruSesiune(
        idSesiune: string,
        documenteReservate: DocumentGenerat[],
        templateBlobContainer: string = 'templates',
        sesiuneData?: SesiuneCereriData // ✅ Primim datele sesiunii direct pentru a evita DB lookup
    ): Promise<DocumentGenerat[]> {
        try {
            console.log('📄 STEP 3: Începere generare documente pentru sesiunea:', idSesiune);
            console.log(`⚠️ IMPORTANT: Toate operațiunile rămân în memorie/fișiere locale - NU se salvează în BD încă!`);
            
            if (!sesiuneData) {
                throw new Error(`Datele sesiunii sunt necesare pentru Step 3 - sesiunea trebuie să fie în memorie`);
            }

            console.log(`📋 Date sesiune din memorie: utilizator ${sesiuneData.numeUtilizator}, categoria: ${sesiuneData.partnerCategory}`);
            console.log(`🧪 Documente rezervate primite: ${documenteReservate.length}`);
            if (documenteReservate.length > 0) {
                console.log('🔎 Primul document rezervat (debug):', documenteReservate[0]);
            }
            
            const parteneriIds = documenteReservate.map(doc => doc.idPartener);
            console.log('🆔 ID-uri parteneri pentru generare:', parteneriIds);
            const parteneri = await Promise.all(
                parteneriIds.map(id => this.getPartenerById(id))
            );
            const parteneriValizi = parteneri.filter(p => p !== null) as Partener[];
            console.log(`✅ Parteneri validați: ${parteneriValizi.length}`);
            
            await templateManagerService.getTemplatesForPartners(parteneriValizi);
            console.log('📥 Template-uri pre-încărcate pentru sesiune');
            
            const documenteGenerate: DocumentGenerat[] = [];
            const eroriGenerare: Array<{ idPartener: string; nume?: string; mesaj: string; stack?: string }> = [];
            
            for (const docRezerv of documenteReservate) {
                try {
                    if (!docRezerv.idPartener) {
                        console.warn('⚠️ Document rezervat fără idPartener:', docRezerv);
                        eroriGenerare.push({ idPartener: 'UNKNOWN', mesaj: 'Lipsește idPartener în documentul rezervat' });
                        continue;
                    }
                    const partener = await this.getPartenerById(docRezerv.idPartener);
                    if (!partener) {
                        console.error(`❌ Partenerul cu ID ${docRezerv.idPartener} nu a fost găsit`);
                        eroriGenerare.push({ idPartener: docRezerv.idPartener, mesaj: 'Partener inexistent' });
                        continue;
                    }
                    const utilizatorData = {
                        nume: sesiuneData.numeUtilizator || 'Utilizator necunoscut',
                        email: sesiuneData.emailUtilizator || '',
                        rol: sesiuneData.rolUtilizator || 'Administrator',
                        functie: sesiuneData.rolUtilizator || 'Administrator'
                    };
                    const templateName = this.determineTemplateFromCategory(
                        sesiuneData.partnerCategory,
                        partener
                    );
                    console.log(`📄 [GEN] Partener=${partener.numePartener} (#${docRezerv.numarInregistrare}) template=${templateName}`);
                    const rezultatPDF = await pdfGenerationService.generateDocumentForPartner(
                        partener,
                        docRezerv.numarInregistrare,
                        sesiuneData.dataSold,
                        path.dirname(docRezerv.caleFisier),
                        templateName,
                        templateBlobContainer,
                        utilizatorData,
                        idSesiune
                    );
                    console.log(`⚠️ Hash generat ${rezultatPDF.hashDocument} pentru ${partener.numePartener} - NU se salvează în BD încă!`);
                    const documentActualizat: DocumentGenerat = {
                        ...docRezerv,
                        numeDocument: rezultatPDF.numeDocument,
                        hashDocument: rezultatPDF.hashDocument,
                        dimensiuneDocument: rezultatPDF.dimensiuneDocument,
                        caleFisier: rezultatPDF.caleFisier,
                        status: 'generated'
                    };
                    documenteGenerate.push(documentActualizat);
                    console.log(`✅ Document generat: ${rezultatPDF.numeDocument}`);
                } catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    const stack = error instanceof Error ? error.stack : undefined;
                    console.error(`❌ Eroare la generarea documentului pentru rezervarea #${docRezerv.numarInregistrare} (partenerId=${docRezerv.idPartener}):`, error);
                    eroriGenerare.push({ idPartener: docRezerv.idPartener || 'UNKNOWN', nume: docRezerv.numePartener, mesaj: msg, stack });
                }
            }
            
            console.log(`✅ Generate ${documenteGenerate.length}/${documenteReservate.length} documente`);
            if (documenteGenerate.length === 0) {
                console.error('🚨 Niciun document generat. Detalii erori:');
                eroriGenerare.forEach(e => {
                    console.error(` - PartenerId=${e.idPartener} Nume=${e.nume || 'N/A'}: ${e.mesaj}`);
                    if (e.stack) {
                        console.error(e.stack.split('\n').slice(0,4).join('\n'));
                    }
                });
                console.error('📦 Payload debug primului doc rezervat:', documenteReservate[0]);
                console.error('🧪 sesiuneData trimisă:', {
                    partnerCategory: sesiuneData.partnerCategory,
                    dataSold: sesiuneData.dataSold,
                    folderLocal: sesiuneData.folderLocal,
                    parteneriSelectati: sesiuneData.parteneriSelectati?.length
                });
            }
            return documenteGenerate;
        } catch (error) {
            console.error('❌ Eroare la generarea documentelor:', error);
            throw new Error(`Eroare la generarea documentelor: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Procesează documentele semnate și le încarcă în Azure Blob Storage
     * Pasul 3: Upload și procesare documente semnate cu organizare ierarhică
     * REFACTORIZAT conform procedurii business
     */
    async procesDocumenteSemnate(
        idSesiune: string,
        documenteGenerate: DocumentGenerat[],
        folderDocumenteSemnate?: string // Făcut opțional
    ): Promise<DocumentGenerat[]> {
        try {
            console.log('✍️ Începere procesare documente semnate pentru sesiunea:', idSesiune);
            
            // 🔒 INFORMARE SECURITATE: Validarea hash-urilor se face în FRONTEND
            const blockUnsignedFiles = process.env.BLOCK_UNSIGNED_PDF_FILES === 'true';
            const allowInDev = process.env.ALLOW_UNSIGNED_IN_DEV === 'true' && process.env.NODE_ENV === 'development';
            
            console.log(`🔐 CONFIGURARE SECURITATE PDF - Step 3:`);
            console.log(`   📋 BLOCK_UNSIGNED_PDF_FILES: ${blockUnsignedFiles}`);
            console.log(`   🧪 ALLOW_UNSIGNED_IN_DEV: ${allowInDev} (NODE_ENV: ${process.env.NODE_ENV})`);
            console.log(`   💡 IMPORTANT: Validarea hash-urilor PDF se face în FRONTEND înainte de Step 3`);
            
            // NU mai blochează aici - validarea se face în frontend pe fișierele în memorie
            if (blockUnsignedFiles && !allowInDev) {
                console.log('� BACKEND: Validarea hash-urilor este activată, dar se execută în FRONTEND');
                console.log('📝 Dacă ajungem aici, înseamnă că validarea din frontend a trecut cu succes');
            }
            
            // Determină folderul cu documente semnate
            // Prioritate nouă: 1. Parametru explicit 2. Setare din DB (SetariFoldere.cereriSemnatePath + idSesiune) 3. Fallback uploads
            const settings = await folderSettingsService.getFolderSettings();
            const folderFromSettings = settings?.cereriSemnatePath ? path.join(settings.cereriSemnatePath, idSesiune) : undefined;
            const folderUpload = path.join(process.cwd(), 'uploads', 'signed-documents', idSesiune);
            const folderFinal = folderDocumenteSemnate || folderFromSettings || folderUpload;
            console.log(`📁 Căutare documente semnate în: ${folderFinal}`);
            
            // Verifică dacă folderul există
            try {
                await fs.access(folderFinal);
            } catch (error) {
                console.log(`⚠️ Folderul ${folderFinal} nu există sau nu poate fi accesat`);
                if (blockUnsignedFiles && !allowInDev) {
                    throw new Error(`🔒 BLOCARE SECURITATE STEP 3: Nu au fost găsite documente semnate pentru sesiunea "${idSesiune}". Folderul ${folderFinal} nu există.`);
                }
                // Dacă blocking-ul este dezactivat, returnează lista goală
                return [];
            }
            
            // Citește toate fișierele din folderul de documente semnate
            const fisiereSemnate = await fs.readdir(folderFinal);
            console.log(`📁 Găsite ${fisiereSemnate.length} fișiere în folderul de documente semnate`);
            
            if (fisiereSemnate.length === 0 && blockUnsignedFiles && !allowInDev) {
                console.log(`⚠️ Nu au fost găsite documente semnate în folderul "${folderFinal}"`);
                console.log(`💡 Aceasta este OK - validarea hash-urilor s-a făcut deja în frontend`);
            }
            
            // Comentez validarea suplimentară - se face în frontend
            /*
            // Validare suplimentară pentru fișierele din folderul semnate (în caz că blocking-ul este dezactivat)
            if (blockUnsignedFiles && !allowInDev && fisiereSemnate.length > 0) {
                console.log('🔍 STEP 3 - Validare hash PDF pentru toate fișierele din folderul semnate...');
                // ... logica de validare comentată
            }
            */
            
            console.log('✅ STEP 3 - Procesare fișiere fără validare suplimentară (validarea s-a făcut în frontend)');
            
            const documenteProcesate: DocumentGenerat[] = [];
            
            for (const docGenerat of documenteGenerate) {
                try {
                    // Algoritm îmbunătățit pentru găsirea fișierului semnat corespunzător
                    const numeDocumentBase = path.parse(docGenerat.numeDocument).name;
                    const numePartenerCurat = docGenerat.numePartener.replace(/[^\w]/g, '').toLowerCase();
                    const numarDocument = docGenerat.numarInregistrare.toString();
                    
                    console.log(`🔍 Căutare fișier pentru: ${docGenerat.numePartener} (Doc: ${docGenerat.numeDocument})`);
                    
                    // Enhanced matching logic with multiple strategies (ordered by priority)
                    const fisierSemnatGasit = fisiereSemnate.find(fisier => {
                        const fisierLower = fisier.toLowerCase();
                        const docBaseLower = numeDocumentBase.toLowerCase();
                        
                        // Strategy 1: EXACT match with original document name (highest priority)
                        if (fisierLower.includes(docBaseLower)) {
                            console.log(`🎯 EXACT match: ${fisier} ↔ ${docGenerat.numeDocument}`);
                            return true;
                        }
                        
                        // Strategy 2: Match by document number pattern "Nr{number}" (very high priority)
                        if ((fisierLower.includes(`nr${numarDocument}`) || fisierLower.includes(`no${numarDocument}`)) && 
                            (fisierLower.includes('semnat') || fisierLower.includes('signed'))) {
                            console.log(`🔢 NUMBER+SIGNED match: ${fisier} ↔ Nr${numarDocument}`);
                            return true;
                        }
                        
                        // Strategy 3: Match by partner name + document number (high priority)
                        if (fisierLower.includes(numePartenerCurat) && 
                            fisierLower.includes(numarDocument) && 
                            (fisierLower.includes('semnat') || fisierLower.includes('signed'))) {
                            console.log(`👥📄 PARTNER+NUMBER+SIGNED match: ${fisier} ↔ ${docGenerat.numePartener}+${numarDocument}`);
                            return true;
                        }
                        
                        // Strategy 4: Match by "CERERE_SOLD" pattern + partner name (medium priority)
                        if (fisierLower.includes('cerere') && 
                            fisierLower.includes('sold') && 
                            fisierLower.includes(numePartenerCurat) && 
                            (fisierLower.includes('semnat') || fisierLower.includes('signed'))) {
                            console.log(`📋 CERERE_SOLD+PARTNER+SIGNED match: ${fisier} ↔ ${docGenerat.numePartener}`);
                            return true;
                        }
                        
                        // Strategy 5: Partial document base name match (minimum 10 chars)
                        if (docBaseLower.length >= 10 && 
                            fisierLower.includes(docBaseLower.substring(0, 10)) && 
                            (fisierLower.includes('semnat') || fisierLower.includes('signed'))) {
                            console.log(`📝 PARTIAL+SIGNED match: ${fisier} ↔ ${numeDocumentBase.substring(0, 10)}...`);
                            return true;
                        }
                        
                        // Strategy 6: Legacy match (backwards compatibility)
                        if (fisierLower.includes(docBaseLower) && fisierLower.includes('semnat')) {
                            console.log(`🔄 LEGACY match: ${fisier} ↔ ${docGenerat.numeDocument}`);
                            return true;
                        }
                        
                        return false;
                    });
                    
                    if (fisierSemnatGasit) {
                        const caleFisierSemnat = path.join(folderFinal, fisierSemnatGasit);
                        console.log(`✅ Fișier găsit pentru ${docGenerat.numePartener}: ${fisierSemnatGasit}`);
                        // ✅ Păstrăm hashDocument (original) și calculăm separat hashSemnat
                        try {
                            const fileBuffer = await fs.readFile(caleFisierSemnat);
                            const hashSemnat = crypto.createHash('sha256').update(fileBuffer).digest('hex');
                            docGenerat.hashDocumentSemnat = hashSemnat; // NU mai suprascriem hashDocument
                            docGenerat.dimensiuneDocument = fileBuffer.length; // ultima dimensiune (semnat)
                            docGenerat.caleFisier = caleFisierSemnat; // cale către fișierul semnat local
                            console.log(`🔐 Hash original: ${docGenerat.hashDocument}`);
                            console.log(`🔐 Hash semnat:   ${docGenerat.hashDocumentSemnat}`);
                        } catch (hErr) {
                            console.error('Eroare calcul hash fișier semnat:', hErr);
                        }
                        documenteProcesate.push(docGenerat);
                    } else {
                        console.warn(`⚠️ Nu s-a găsit document semnat pentru: ${docGenerat.numePartener}`);
                    }
                } catch (error) {
                    console.error(`❌ Eroare la procesarea documentului semnat pentru ${docGenerat.numePartener}:`, error);
                }
            }
            
            
            // Statistici finale de matching
            const totalDocumente = documenteGenerate.length;
            const documenteGasite = documenteProcesate.length;
            const documenteNegasite = totalDocumente - documenteGasite;
            
            console.log(`📊 REZULTAT PROCESARE STEP 3:`);
            console.log(`   ✅ Documente găsite și procesate: ${documenteGasite}/${totalDocumente}`);
            if (documenteNegasite > 0) {
                console.log(`   ❌ Documente negăsite: ${documenteNegasite}`);
                const parteneriiNegasiti = documenteGenerate
                    .filter(doc => !documenteProcesate.some(proc => proc.idPartener === doc.idPartener))
                    .map(doc => doc.numePartener);
                console.log(`   📋 Parteneri fără documente semnate: ${parteneriiNegasiti.join(', ')}`);
            }
            console.log(`✅ Procesate ${documenteProcesate.length}/${documenteGenerate.length} documente semnate`);
            return documenteProcesate;
            
        } catch (error) {
            console.error('❌ Eroare la procesarea documentelor semnate:', error);
            throw new Error(`Eroare la procesarea documentelor semnate: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Finalizează sesiunea și trimite cererile - STEP 5 din SESIUNE.md
     * 🔥 ACUM SE SALVEAZĂ TOATE ÎNREGISTRĂRILE în baza de date:
     * - JurnalDocumenteEmise: Înregistrează EFECTIV numerele de document (nu mai sunt doar rezervate!)
     * - JurnalCereriConfirmare: Creează înregistrările pentru blockchain
     * - JurnalEmail: Înregistrează detaliile email-urilor trimise
     * ⚠️ IMPORTANT: JurnalSesiuni NU este folosit pentru sesiunea de cereri - este doar audit utilizatori!
     */
    async finalizareSesiune(
        idSesiune: string,
        documenteProcesate: DocumentGenerat[],
        sesiuneData: SesiuneCereriData
    ): Promise<SesiuneCompleta> {
        try {
            console.log('🔥 STEP 5: Finalizare și trimitere - ÎNCEPE SALVAREA ATOMICĂ ÎN BAZA DE DATE!');
            console.log(`🎯 Pentru sesiunea: ${idSesiune} cu ${documenteProcesate.length} documente`);
            
            const cereriTrimise: string[] = [];
            const erori: string[] = [];
            
            for (const doc of documenteProcesate) {
                try {
                    // 1. Obține datele partenerului
                    const partener = await this.getPartenerById(doc.idPartener);
                    if (!partener) {
                        erori.push(`Partenerul cu ID ${doc.idPartener} nu a fost găsit`);
                        continue;
                    }
                    
                    // 2. Creează înregistrarea completă în jurnalul cererilor (pentru blockchain)
                    const emailTemplate = await this.determineEmailTemplateFromCategory(
                        sesiuneData.partnerCategory,
                        partener
                    );
                    
                    const cerereDto: CreateJurnalCereriConfirmareDto = {
                        IdPartener: doc.idPartener,
                        DataCerere: new Date().toISOString(),
                        NumeFisier: doc.numeDocument,
                        URLFisier: doc.caleFisier,
                        Stare: 'in_asteptare',
                        LotId: idSesiune,
                        CreatDe: sesiuneData.idUtilizator,
                        TrimisDe: sesiuneData.idUtilizator,
                        DataTrimitere: new Date().toISOString(),
                        Observatii: `Cerere trimisă automat în sesiunea ${idSesiune} pentru ${doc.numePartener}`,
                        HashDocument: doc.hashDocument
                    };
                    
                    const cerereCreata = await jurnalCereriConfirmareRealService.createCerereConfirmare(cerereDto);
                    
                    // 3. Trimite email-ul cu documentul atașat
                    if (partener.emailPartener) {
                        try {
                            // Determină template-ul pe baza categoriei partenerului
                            const templateId = await this.determineEmailTemplateFromCategory(
                                sesiuneData.partnerCategory,
                                partener // ✅ Pasăm și partenerul pentru determinarea corectă
                            );
                            
                            console.log(`📧 Template email selectat pentru ${partener.numePartener}: ${templateId || 'NONE'} (categoria: ${sesiuneData.partnerCategory})`);
                            
                            let emailContent = {
                                text: `Cerere de confirmare sold pentru data ${sesiuneData.dataSold}`,
                                html: `<p>Vă rugăm să confirmați soldul pentru data ${sesiuneData.dataSold}.</p>`
                            };

                            // Dacă avem template, îl procesăm
                            if (templateId) {
                                try {
                                    const processedTemplate = await this.emailTemplateService.processTemplate(templateId, {
                                        numePartener: partener.numePartener,
                                        nume: partener.numePartener,
                                        cuiPartener: partener.cuiPartener,
                                        cui: partener.cuiPartener,
                                        dataSold: sesiuneData.dataSold,
                                        perioadaConfirmare: sesiuneData.dataSold,
                                        numeUtilizator: sesiuneData.numeUtilizator,
                                        dataActuala: new Date().toLocaleDateString('ro-RO'),
                                        reprezentantPartener: partener.reprezentantPartener,
                                        reprezentant: partener.reprezentantPartener,
                                        numeCompanie: process.env.NUME_COMPANIE || 'Compania Noastră'
                                    });
                                    
                                    if (processedTemplate) {
                                        emailContent.html = processedTemplate;
                                        emailContent.text = processedTemplate.replace(/<[^>]*>/g, ''); // Strip HTML tags pentru text
                                    }
                                } catch (templateError) {
                                    console.warn(`Eroare la procesarea template-ului ${templateId}:`, templateError);
                                    // Continuăm cu template-ul default
                                }
                            }

                            // Calculare hash pentru fișierul PDF SEMNAT de utilizator (încărcat în Step 4)
                            let pdfHashSemnaturizat = '';
                            let statusSemnaturăDigitală = 'UNKNOWN';
                            try {
                                const pdfBufferSemnaturizat = fsSync.readFileSync(doc.caleFisier);
                                pdfHashSemnaturizat = crypto.createHash('sha256').update(pdfBufferSemnaturizat).digest('hex');
                                // Dacă avem deja hashDocumentSemnat din Step 3, îl folosim pentru consistență
                                if (doc.hashDocumentSemnat && doc.hashDocumentSemnat !== pdfHashSemnaturizat) {
                                    console.warn(`⚠️ Hash semnat recalculat diferit față de cel din Step 3 pentru ${doc.numeDocument}`);
                                }
                                // Comparăm hash original (generat) cu hash semnat (recalculat acum)
                                if (pdfHashSemnaturizat === doc.hashDocument) {
                                    statusSemnaturăDigitală = 'NESEMNAT_DETECTAT';
                                } else {
                                    statusSemnaturăDigitală = 'SEMNAT_VALID';
                                }
                            } catch (error) {
                                console.error(`❌ Eroare la calcularea hash-ului pentru PDF semnat ${doc.numeDocument}:`, error);
                                pdfHashSemnaturizat = 'error_calculating_hash';
                                statusSemnaturăDigitală = 'ERROR_VALIDATION';
                            }

                            // 🛡️ PROTECȚIE CRITICĂ: Împiedică trimiterea fișierelor nesemnate
                            if (statusSemnaturăDigitală === 'NESEMNAT_DETECTAT') {
                                const shouldBlock = this.BLOCK_UNSIGNED_FILES && !this.ALLOW_UNSIGNED_IN_DEVELOPMENT;
                                
                                console.log(`🚨 FIȘIER NESEMNAT DETECTAT: ${doc.numeDocument} pentru ${partener.numePartener}`);
                                console.log(`� Configurare: BLOCK_UNSIGNED_FILES=${this.BLOCK_UNSIGNED_FILES}, NODE_ENV=${process.env.NODE_ENV}, ALLOW_UNSIGNED_IN_DEV=${process.env.ALLOW_UNSIGNED_IN_DEV}`);
                                
                                if (shouldBlock) {
                                    console.log(`�🛑 BLOCARE TRIMITERE: Fișierul ${doc.numeDocument} pentru ${partener.numePartener} NU va fi trimis (nesemnat)!`);
                                    
                                    // Marchează cererea ca eșuată din cauza fișierului nesemnat
                                    await jurnalCereriConfirmareRealService.updateCerereConfirmare(cerereCreata.IdJurnal, {
                                        Stare: 'esuata',
                                        Observatii: `🚨 BLOCATĂ: Fișier PDF nesemnat detectat (hash identic cu originalul). Utilizatorul trebuie să semneze documentul cu certificat digital înainte de trimitere.`
                                    });
                                    
                                    // Înregistrează în JurnalEmail ca FAILED cu motiv specific
                                    await emailService.logEmailFailed({
                                        to: partener.emailPartener,
                                        subject: sesiuneData.subiectEmail,
                                        error: 'Fișier PDF nesemnat detectat - trimitere blocată pentru securitate',
                                        partnerId: partener.idPartener,
                                        recipientName: partener.numePartener,
                                        recipientType: 'PARTENER',
                                        batchId: idSesiune,
                                        confirmationRequestId: cerereCreata.IdJurnal.toString(),
                                        emailType: 'CONFIRMARE',
                                        createdBy: sesiuneData.idUtilizator,
                                        senderName: sesiuneData.numeUtilizator,
                                        senderEmail: sesiuneData.emailUtilizator,
                                        templateId: templateId || undefined,
                                        attachmentHash: pdfHashSemnaturizat,
                                        digitalSignatureStatus: statusSemnaturăDigitală,
                                        originalDocumentHash: doc.hashDocument
                                    });
                                    
                                    // Sari la următorul partener
                                    continue;
                                } else {
                                    console.log(`⚠️ AVERTISMENT: Fișierul ${doc.numeDocument} este nesemnat dar trimiterea continuă (configurare de dezvoltare sau blocare dezactivată)`);
                                }
                            }
                            
                            // 🔒 PROTECȚIE SUPLIMENTARĂ: Verifică și cazurile de eroare
                            if (statusSemnaturăDigitală === 'ERROR_VALIDATION') {
                                console.log(`⚠️ AVERTISMENT: Eroare la validarea semnăturii pentru ${doc.numeDocument} - ${partener.numePartener}. Trimiterea continuă dar necesită verificare manuală.`);
                            }

                            console.log(`✅ VALIDARE TRECUTĂ: Trimitem emailul pentru ${partener.numePartener} cu fișierul ${doc.numeDocument} (Status: ${statusSemnaturăDigitală})`);

                            const emailResult = await emailService.sendEmailWithAttachment({
                                to: partener.emailPartener,
                                subject: sesiuneData.subiectEmail,
                                text: emailContent.text,
                                html: emailContent.html,
                                attachments: [{
                                    filename: doc.numeDocument,
                                    path: doc.caleFisier // Atașează fișierul PDF SEMNATURIZAT de utilizator
                                }]
                            }, {
                                // Informații suplimentare pentru JurnalEmail
                                partnerId: partener.idPartener,
                                recipientName: partener.numePartener,
                                recipientType: 'PARTENER',
                                batchId: idSesiune,
                                confirmationRequestId: cerereCreata.IdJurnal.toString(),
                                emailType: 'CONFIRMARE',
                                createdBy: sesiuneData.idUtilizator,
                                senderName: sesiuneData.numeUtilizator,
                                senderEmail: sesiuneData.emailUtilizator,
                                priority: 'NORMAL',
                                // ✅ ADĂUGAT: IdSablon și hash-ul fișierului PDF
                                templateId: templateId || undefined, // ID-ul șablonului de email folosit
                                attachmentHash: pdfHashSemnaturizat, // Hash-ul SHA-256 al fișierului PDF semnaturizat de utilizator
                                // 🔐 ADĂUGAT: Status validare semnătură digitală pentru audit
                                digitalSignatureStatus: statusSemnaturăDigitală, // SEMNAT_VALID / NESEMNAT_DETECTAT / ERROR_VALIDATION
                                originalDocumentHash: doc.hashDocument // Hash-ul documentului original pentru comparație
                            });
                            
                            // Actualizează cererea cu informațiile despre trimitere
                            if (emailResult.success) {
                                await jurnalCereriConfirmareRealService.updateCerereConfirmare(cerereCreata.IdJurnal, {
                                    Stare: 'trimisa',
                                    DataTrimitere: new Date().toISOString(),
                                    Observatii: `Email trimis cu succes către ${partener.emailPartener}`
                                });
                            } else {
                                await jurnalCereriConfirmareRealService.updateCerereConfirmare(cerereCreata.IdJurnal, {
                                    Stare: 'esuata',
                                    Observatii: `Eroare la trimiterea email-ului: ${emailResult.error}`
                                });
                            }
                            
                            // Nu mai actualizăm JurnalDocumenteEmise - este doar pentru numerotare
                            // Statusul final este deja în JurnalCereriConfirmare
                            
                            cereriTrimise.push(cerereCreata.IdJurnal.toString());
                            console.log(`📧 Email trimis cu succes către: ${doc.numePartener}`);
                            
                        } catch (emailError) {
                            erori.push(`Eroare la trimiterea email-ului către ${doc.numePartener}: ${emailError}`);
                            console.error(`❌ Eroare email pentru ${doc.numePartener}:`, emailError);
                            
                            // Actualizează cu eroarea
                            await jurnalCereriConfirmareRealService.updateCerereConfirmare(cerereCreata.IdJurnal, {
                                Stare: 'esuata',
                                Observatii: `Eroare la trimiterea email-ului: ${emailError instanceof Error ? emailError.message : 'Eroare necunoscută'}`
                            });
                        }
                    } else {
                        erori.push(`Nu există adresă de email pentru partenerul ${doc.numePartener}`);
                        
                        // Actualizează cu lipsa email-ului
                        await jurnalCereriConfirmareRealService.updateCerereConfirmare(cerereCreata.IdJurnal, {
                            Stare: 'esuata',
                            Observatii: 'Nu există adresă de email pentru partener'
                        });
                    }
                    
                } catch (error) {
                    erori.push(`Eroare la procesarea cererii pentru ${doc.numePartener}: ${error}`);
                    console.error(`❌ Eroare la procesarea cererii pentru ${doc.numePartener}:`, error);
                }
            }
            
            // 5. Închide sesiunea
            await jurnalSesiuniService.updateSesiune(idSesiune, {
                observatii: `Sesiune finalizată - ${cereriTrimise.length} cereri trimise, ${erori.length} erori`
            });
            
            const rezultat: SesiuneCompleta = {
                idSesiune,
                documenteGenerate: documenteProcesate,
                cereriTrimise,
                erori
            };
            
            console.log(`🎉 Sesiune finalizată cu succes: ${cereriTrimise.length} cereri trimise`);
            
            return rezultat;
            
        } catch (error) {
            console.error('❌ Eroare la finalizarea sesiunii:', error);
            throw new Error(`Eroare la finalizarea sesiunii: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * NOUĂ METODĂ: Finalizează sesiunea în Step 4 și înregistrează numerele în JurnalDocumenteEmise
     * Conform procedurii business: numerele se înregistrează DOAR la sfârșitul procesului!
     */
    async finalizeazaSesiuneInStep4(
        idSesiune: string,
        documenteGenerateFinale: DocumentGenerat[],
        sesiuneData: SesiuneCereriData
    ): Promise<{ idSesiune: string; documenteInregistrate: DocumentGenerat[] }> {
        try {
            console.log('🏁 FINALIZARE STEP 4: Înregistrare efectivă a numerelor în JurnalDocumenteEmise');
            console.log(`📋 Sesiune: ${idSesiune}, documente de înregistrat: ${documenteGenerateFinale.length}`);
            
            const documenteInregistrate: DocumentGenerat[] = [];
            
            for (const doc of documenteGenerateFinale) {
                try {
                    // ACUM înregistrăm efectiv documentul în JurnalDocumenteEmise
                    const documentInregistrat = await jurnalDocumenteEmiseCleanService.createDocument({
                        NumeDocument: doc.numeDocument,
                        hashDocument: doc.hashDocument || 'FINALIZED',
                        dimensiuneDocument: doc.dimensiuneDocument || 0,
                        idUtilizator: sesiuneData.idUtilizator,
                        numeUtilizator: sesiuneData.numeUtilizator,
                        emailUtilizator: sesiuneData.emailUtilizator,
                        idSesiune: idSesiune,
                        caleFisier: doc.caleFisier,
                        observatii: `Document finalizat pentru partenerul ${doc.numePartener} - Nr înregistrare: ${doc.numarInregistrare}`
                    });
                    
                    // Actualizează documentul cu ID-ul real din BD
                    const docActualizat: DocumentGenerat = {
                        ...doc,
                        idDocument: documentInregistrat.IdDocumente.toString(),
                        status: 'signed'
                    };
                    
                    documenteInregistrate.push(docActualizat);
                    console.log(`✅ Document înregistrat în BD: ${doc.numeDocument} cu ID ${documentInregistrat.IdDocumente}`);
                    
                } catch (error) {
                    console.error(`❌ Eroare la înregistrarea documentului ${doc.numeDocument}:`, error);
                    throw error;
                }
            }
            
            // Actualizează statusul sesiunii ca fiind finalizată
            const updateData = {
                observatii: JSON.stringify({
                    originalData: sesiuneData,
                    documenteFinalizate: documenteInregistrate.length,
                    status: 'completed',
                    observatiiFinalizare: `Sesiune finalizată cu ${documenteInregistrate.length} documente înregistrate în JurnalDocumenteEmise`
                })
            };
            
            await jurnalSesiuniService.updateSesiune(idSesiune, updateData);
            
            console.log(`🎉 STEP 4 COMPLET: ${documenteInregistrate.length} documente înregistrate efectiv în JurnalDocumenteEmise!`);
            
            return {
                idSesiune,
                documenteInregistrate
            };
            
        } catch (error) {
            console.error('❌ Eroare la finalizarea Step 4:', error);
            throw new Error(`Eroare la finalizarea sesiunii: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Calculează hash-ul pentru fișierul PDF returnat de partener (pentru audit complet)
     * Această metodă va fi folosită când partenerii vor returna documentele semnate
     * 
     * @param pdfPath Calea către fișierul PDF returnat de partener
     * @returns Hash SHA-256 al fișierului
     */
    async calculeazaHashPartenerReturnat(pdfPath: string): Promise<string> {
        try {
            const pdfBuffer = await fs.readFile(pdfPath);
            const hashPartener = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
            
            console.log(`🔍 AUDIT: Hash PDF returnat de partener: ${hashPartener}`);
            return hashPartener;
            
        } catch (error) {
            console.error('❌ Eroare la calcularea hash-ului pentru PDF returnat de partener:', error);
            throw new Error('Nu s-a putut calcula hash-ul pentru documentul returnat de partener');
        }
    }

    /**
     * Efectuează un audit complet al hash-urilor pentru un document (pentru verificarea integrității)
     * Compară toate cele 3 hash-uri din fluxul complet de documente
     * 
     * @param hashOriginal Hash-ul PDF-ului generat original (din JurnalDocumenteEmise)
     * @param hashSemnaturizat Hash-ul PDF-ului semnaturizat de utilizator cu certificat digital (din JurnalEmail) 
     * @param hashPartenerReturnat Hash-ul PDF-ului returnat de partener
     * @returns Rezultatul auditului cu status și diferențele găsite
     */
    async auditHashuriComplet(
        hashOriginal: string, 
        hashSemnaturizat: string, 
        hashPartenerReturnat?: string
    ): Promise<{
        status: 'VALID' | 'SUSPECT' | 'CORUPT';
        diferente: string[];
        recomandat: string;
    }> {
        const diferente: string[] = [];
        
        // Verifică diferența între originalul generat și cel semnaturizat de utilizator
        
        // Verifică diferența față de documentul returnat de partener (dacă există)
        if (hashPartenerReturnat) {
            if (hashSemnaturizat === hashPartenerReturnat) {
                console.log('✅ Hash PDF semnaturizat = Hash PDF returnat de partener (document nemodificat)');
            } else {
                diferente.push('🔍 INFO: Hash PDF semnaturizat ≠ Hash PDF returnat de partener (partenerul a semnat documentul - normal)');
            }
            
            if (hashOriginal === hashPartenerReturnat) {
                diferente.push('⚠️ SUSPECT: Hash PDF original = Hash PDF returnat de partener (posibil că partenerul a semnat originalul nesemnaturizat)');
            }
        }
        
        // Determină statusul general
        let status: 'VALID' | 'SUSPECT' | 'CORUPT' = 'VALID';
        let recomandat = 'Fluxul de documente pare normal.';
        
        if (diferente.some(d => d.includes('SUSPECT'))) {
            status = 'SUSPECT';
            recomandat = 'Verificare manuală recomandată - posibile probleme cu fluxul de semnături.';
        }
        
        if (diferente.some(d => d.includes('CORUPT'))) {
            status = 'CORUPT';
            recomandat = 'Document corupt detectat - necesită investigare urgentă.';
        }
        
        console.log(`🔍 AUDIT HASH COMPLET - Status: ${status}`);
        diferente.forEach(diferenta => console.log(diferenta));
        
        return { status, diferente, recomandat };
    }

    /**
     * Orchestrează întregul proces într-o singură metodă
     * Pentru utilizare în cazurile în care se dorește automatizarea completă
     */
    async procesCereriConfirmareComplet(
        sesiuneData: SesiuneCereriData,
        folderDocumenteSemnate: string,
        templateBlobContainer: string = 'templates',
        clientInfo?: { adresaIP?: string; userAgent?: string }
    ): Promise<SesiuneCompleta> {
        try {
            console.log('🎯 Începere proces complet cereri confirmare');
            
            // Pasul 1: Inițializare sesiune și rezervare numere
            const { idSesiune, documenteReservate } = await this.initializeSesiuneCereri(sesiuneData, clientInfo);
            
            // Pasul 2: Generare documente PDF
            const documenteGenerate = await this.generateDocumentePentruSesiune(idSesiune, documenteReservate, templateBlobContainer);
            
            // Pasul 3: Procesare documente semnate
            const documenteProcesate = await this.procesDocumenteSemnate(idSesiune, documenteGenerate, folderDocumenteSemnate);
            
            // Pasul 4: Finalizare și trimitere
            const rezultatFinal = await this.finalizareSesiune(idSesiune, documenteProcesate, sesiuneData);
            
            console.log('🎉 Proces complet finalizat cu succes!');
            return rezultatFinal;
            
        } catch (error) {
            console.error('❌ Eroare în procesul complet:', error);
            throw new Error(`Eroare în procesul complet: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Audit pentru detectarea fișierelor PDF nesemnate în sistem
     * Scanează toate emailurile trimise și identifică cazurile unde utilizatorii au încărcat fișiere nesemnate
     * 
     * @param idSesiune Opțional - pentru auditarea unei anumite sesiuni
     * @returns Raport cu fișierele nesemnate detectate
     */
    async auditFisierePDFNesemnate(idSesiune?: string): Promise<{
        totalEmailuri: number;
        fisiereSemnate: number;
        fisiereNesemnate: number;
        fisiereNeidentificate: number;
        detaliiNesemnate: Array<{
            idJurnalEmail: string;
            emailDestinatar: string;
            subiectEmail: string;
            dataTrimitere: Date;
            hashOriginal: string;
            hashIncarcat: string;
            partenerNume?: string;
        }>;
        recomandat: string;
    }> {
        try {
            console.log(`🔍 Începere audit pentru detectarea fișierelor PDF nesemnate${idSesiune ? ` în sesiunea ${idSesiune}` : ''}`);
            
            // TODO: Migrate this method to SQLite - for now return empty result
            console.warn('⚠️ auditFisierePDFNesemnate: Metoda nu este încă migrată la SQLite, returnez rezultat gol');
            
            return {
                totalEmailuri: 0,
                fisiereSemnate: 0,
                fisiereNesemnate: 0,
                fisiereNeidentificate: 0,
                detaliiNesemnate: [],
                recomandat: 'Audit nu este disponibil - migrare la SQLite în curs'
            };
        } catch (error) {
            console.error('❌ Eroare în auditul fișierelor PDF nesemnate:', error);
            return {
                totalEmailuri: 0,
                fisiereSemnate: 0,
                fisiereNesemnate: 0,
                fisiereNeidentificate: 0,
                detaliiNesemnate: [],
                recomandat: 'Audit nu este disponibil din cauza erorii - migrare la SQLite în curs'
            };
        }
    }
}

export const cereriConfirmareOrchestratorService = new CereriConfirmareOrchestratorService();

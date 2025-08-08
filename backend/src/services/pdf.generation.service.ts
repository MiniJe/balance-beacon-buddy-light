import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { Partener } from '../models/Partener';
import { TemplateManagerService, TipTemplate } from './template.manager.service';

/**
 * Rezultatul generării unui document PDF
 */
interface GeneratedDocument {
    numeDocument: string;
    caleFisier: string;
    hashDocument: string;
    dimensiuneDocument: number;
    templateFolosit: string;
    dataGenerare: string;
}

/**
 * Serviciu pentru generarea documentelor PDF din template-uri DOCX
 * Implementează procesul complet: descărcare template → completare date → conversie PDF
 */
export class PDFGenerationService {
    
    private tempDir = path.join(process.cwd(), 'temp');
    private templateManager = new TemplateManagerService();

    constructor() {
        // Asigură-te că directorul temp există
        this.ensureTempDirectory();
    }

    /**
     * Asigură că directorul temporar există
     */
    private async ensureTempDirectory(): Promise<void> {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (error) {
            console.error('Eroare la crearea directorului temp:', error);
        }
    }

    /**
     * Calculează hash SHA-256 pentru fișier
     */
    private async calculateFileHash(filePath: string): Promise<string> {
        try {
            const fileBuffer = await fs.readFile(filePath);
            return crypto.createHash('sha256').update(fileBuffer).digest('hex');
        } catch (error) {
            console.error('Eroare la calcularea hash-ului:', error);
            throw new Error('Nu s-a putut calcula hash-ul fișierului');
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
            console.error('Eroare la obținerea dimensiunii:', error);
            throw new Error('Nu s-a putut obține dimensiunea fișierului');
        }
    }

    /**
     * Descarcă template-ul din Azure și îl salvează local pentru utilizare de către Python
     * ✅ OPTIMIZAT: Cache local pentru template-uri
     */
    private async downloadTemplateLocally(templateName: string): Promise<string> {
        try {
            // Creează calea completă cu subdirectoarele necesare
            const localTemplatePath = path.join(this.tempDir, templateName);
            
            // ✅ CACHE: Verifică dacă template-ul există deja local
            try {
                await fs.access(localTemplatePath);
                console.log(`� Template găsit în cache: ${templateName}`);
                return localTemplatePath; // Template-ul există deja, nu îl mai descărcăm
            } catch (accessError) {
                // Template-ul nu există local, trebuie să îl descărcăm
                console.log(`�📥 Descărcare template local: ${templateName}`);
            }
            
            // Determină tipul template-ului pe baza numelui
            const tipTemplate = this.determineTemplateTypeFromName(templateName);
            
            // Descarcă template-ul din Azure
            const templateBuffer = await this.templateManager.getTemplate(tipTemplate);
            
            const templateDir = path.dirname(localTemplatePath);
            
            // Asigură-te că directorul există
            await fs.mkdir(templateDir, { recursive: true });
            
            // Salvează template-ul local
            await fs.writeFile(localTemplatePath, templateBuffer);
            
            console.log(`✅ Template salvat local: ${localTemplatePath}`);
            return localTemplatePath;
            
        } catch (error) {
            console.error(`❌ Eroare la descărcarea template-ului ${templateName}:`, error);
            throw new Error(`Nu s-a putut descărca template-ul ${templateName}: ${error}`);
        }
    }

    /**
     * Determină tipul template-ului din numele fișierului
     */
    private determineTemplateTypeFromName(templateName: string): TipTemplate {
        if (templateName.includes('clienți-duc')) return 'client_duc';
        if (templateName.includes('clienți-dl')) return 'client_dl';
        if (templateName.includes('furnizori-duc')) return 'furnizor_duc';
        if (templateName.includes('furnizori-dl')) return 'furnizor_dl';
        
        // Default
        return 'client_duc';
    }

    /**
     * Generează un document PDF pentru un partener folosind advanced_pdf_generator.py
     */
    async generateDocumentForPartner(
        partener: Partener,
        numarInregistrare: number,
        dataSold: string,
        outputDirectory: string,
        templateName: string,          // ADĂUGAT: numele template-ului selectat în Step 1
        templateContainer: string = 'templates',
        utilizatorData?: any,
        numarSesiune?: string
    ): Promise<GeneratedDocument> {
        try {
            console.log(`📄 Generare document pentru: ${partener.numePartener}`);
            console.log(`📋 Template selectat: ${templateName}`);
            
            // 1. Asigură-te că directorul de output există
            await fs.mkdir(outputDirectory, { recursive: true });

            // 2. Descarcă template-ul local pentru Python
            const localTemplatePath = await this.downloadTemplateLocally(templateName);
            
            // 3. Calea către scriptul Python avansat
            const pythonScript = path.join(__dirname, '../../scripts/advanced_pdf_generator.py');
            
            // Verifică că scriptul Python există
            try {
                await fs.access(pythonScript);
            } catch (error) {
                throw new Error(`Scriptul Python avansat nu a fost găsit: ${pythonScript}`);
            }
            
            // 4. Pregătește comanda Python cu parametrii necesari
            const pythonCommand = process.env.PYTHON_EXECUTABLE || (process.platform === 'win32' ? 'py' : 'python3');
            
            // Obține connection string-ul din variabilele de mediu
            const server = process.env.DB_SERVER;
            const database = process.env.DB_NAME;
            const user = process.env.DB_USER;
            const password = process.env.DB_PASSWORD;
            
            if (!server || !database || !user || !password) {
                throw new Error('Variabilele de mediu pentru Azure SQL nu sunt complete (DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD)');
            }
            
            // Construiește connection string-ul pentru Python (pyodbc format)
            const connectionString = `DRIVER={ODBC Driver 18 for SQL Server};SERVER=${server};DATABASE=${database};UID=${user};PWD=${password};Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;`;
            
            // Formatează data pentru scriptul Python (DD.MM.YYYY)
            const dataEmiterii = new Date().toLocaleDateString('ro-RO');
            const dataSoldFormatata = new Date(dataSold).toLocaleDateString('ro-RO');
            
            const args = [
                pythonScript,
                '--partner-id', partener.idPartener,
                '--connection-string', connectionString,
                '--nr-document', numarInregistrare.toString(),
                '--data-emiterii', dataEmiterii,
                '--data-sold', dataSoldFormatata,
                '--template-name', templateName,
                '--template-path', localTemplatePath,  // ADĂUGAT: calea locală către template
                '--output-dir', outputDirectory,
                '--json'  // ✅ OPTIMIZARE: Activează silent mode pentru performanță (elimină logging-ul Python)
            ];
            
            console.log(`🐍 Executare script Python avansat pentru generarea PDF...`);
            
            // 4. Execută scriptul Python avansat
            const result = await this.executeAdvancedPythonScript(pythonCommand, args);
            
            if (!result.success) {
                throw new Error(`Scriptul Python avansat a eșuat: ${result.error}`);
            }
            
            console.log(`✅ Document generat cu succes de scriptul Python avansat:`);
            console.log(`   - Număr document: ${result.nr_document}`);
            console.log(`   - Template folosit: ${result.template_used}`);
            console.log(`   - Fișier DOCX: ${result.docx_path}`);
            console.log(`   - Fișier PDF: ${result.pdf_path || 'Nu s-a generat'}`);
            
            // 5. Calculează informațiile finale pentru document
            const numeDocument = path.basename(result.pdf_path || result.docx_path);
            const caleFisier = result.pdf_path || result.docx_path;
            
            const hashDocument = await this.calculateFileHash(caleFisier);
            const dimensiuneDocument = await this.getFileSize(caleFisier);
            
            const rezultat: GeneratedDocument = {
                numeDocument,
                caleFisier,
                hashDocument,
                dimensiuneDocument,
                templateFolosit: templateName,
                dataGenerare: new Date().toISOString()
            };
            
            console.log(`✅ Document generat cu succes: ${numeDocument}`);
            return rezultat;
            
        } catch (error) {
            console.error(`❌ Eroare la generarea documentului pentru ${partener.numePartener}:`, error);
            throw new Error(`Eroare la generarea documentului: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Execută scriptul Python avansat pentru generarea PDF-urilor
     */
    private async executeAdvancedPythonScript(
        pythonCommand: string,
        args: string[]
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            const child = spawn(pythonCommand, args, {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            // Colectează output-ul
            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Scriptul Python avansat a eșuat cu codul ${code}: ${stderr}`));
                    return;
                }

                if (stderr && stderr.trim()) {
                    console.warn(`⚠️ Python stderr: ${stderr}`);
                }

                try {
                    const result = JSON.parse(stdout);
                    resolve(result);
                } catch (parseError) {
                    console.error('❌ Nu s-a putut parsa rezultatul Python avansat:', stdout);
                    reject(new Error(`Rezultat invalid de la scriptul Python avansat: ${parseError}`));
                }
            });

            child.on('error', (error) => {
                reject(new Error(`Eroare la executarea scriptului Python avansat: ${error.message}`));
            });

            // Timeout după 60 secunde (mai mult timp pentru procesare avansată)
            const timeout = setTimeout(() => {
                child.kill();
                reject(new Error('Timeout la executarea scriptului Python avansat (60s)'));
            }, 60000);

            child.on('close', () => {
                clearTimeout(timeout);
            });
        });
    }

    /**
     * Generează documente folosind advanced_pdf_generator.py pentru mai mulți parteneri
     */
    async generateDocumentsForPartners(
        parteneri: Partener[],
        numerePornire: number,
        dataSold: string,
        outputDirectory: string,
        templateName: string,          // ADĂUGAT: numele template-ului selectat în Step 1
        templateContainer: string = 'templates',
        utilizatorData?: any,
        numarSesiune?: string
    ): Promise<GeneratedDocument[]> {
        try {
            console.log(`📦 Generare în lot pentru ${parteneri.length} parteneri folosind advanced_pdf_generator.py`);
            console.log(`👤 Utilizator: ${utilizatorData?.nume || 'Necunoscut'}`);
            console.log(`🗓️ Data sold: ${dataSold}`);
            console.log(`📋 Template: ${templateName}`);
            
            // Asigură-te că directorul de output există
            await fs.mkdir(outputDirectory, { recursive: true });
            
            const documenteGenerate: GeneratedDocument[] = [];
            
            // Generează documentele pentru fiecare partener folosind advanced_pdf_generator.py
            for (let i = 0; i < parteneri.length; i++) {
                const partener = parteneri[i];
                const numarInregistrare = numerePornire + i;
                
                try {
                    console.log(`📄 Procesare ${i + 1}/${parteneri.length}: ${partener.numePartener}`);
                    
                    const document = await this.generateDocumentForPartner(
                        partener,
                        numarInregistrare,
                        dataSold,
                        outputDirectory,
                        templateName,
                        templateContainer,
                        utilizatorData,
                        numarSesiune
                    );
                    
                    documenteGenerate.push(document);
                    console.log(`✅ Document ${i + 1} generat: ${document.numeDocument}`);
                    
                } catch (error) {
                    console.error(`❌ Eroare pentru partenerul ${partener.numePartener}:`, error);
                    // Continuă cu următorul partener
                }
            }
            
            console.log(`🎉 Generate ${documenteGenerate.length}/${parteneri.length} documente cu succes`);
            return documenteGenerate;
            
        } catch (error) {
            console.error('❌ Eroare la generarea în lot:', error);
            throw new Error(`Eroare la generarea în lot: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Generează un document de test pentru verificarea funcționalității folosind advanced_pdf_generator.py
     */
    async generateTestDocument(
        outputDirectory: string,
        templateName: string = 'document_template_clienți-duc.docx',  // Template implicit pentru test
        utilizatorData?: any
    ): Promise<GeneratedDocument> {
        try {
            console.log('🧪 Generare document de test folosind advanced_pdf_generator.py...');
            console.log(`📋 Template test: ${templateName}`);
            
            // Partener de test
            const partenerTest: Partener = {
                idPartener: 'test-id',
                numePartener: 'COMPANIA TEST SRL',
                cuiPartener: 'RO12345678',
                onrcPartener: 'J01/123/2020',
                emailPartener: 'contact@test.ro',
                reprezentantPartener: 'Ion Popescu',
                clientDUC: true,
                furnizorDUC: false,
                clientDL: false,
                furnizorDL: false,
                adresaPartener: 'Str. Test Nr. 1, București',
                telefonPartener: '0212345678',
                observatiiPartener: 'Partener de test',
                partenerActiv: true
            };
            
            const numarTest = 999999;
            const dataSoldTest = '2023-12-31';
            const numarSesiune = 'TEST-SESSION-' + Date.now();
            
            const document = await this.generateDocumentForPartner(
                partenerTest,
                numarTest,
                dataSoldTest,
                outputDirectory,
                templateName,
                'templates',
                utilizatorData || { nume: 'Utilizator Test', rol: 'Administrator' },
                numarSesiune
            );
            
            console.log('✅ Document de test generat cu succes:', document.numeDocument);
            return document;
            
        } catch (error) {
            console.error('❌ Eroare la generarea documentului de test:', error);
            throw new Error(`Eroare la generarea documentului de test: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Curăță toate fișierele temporare
     */
    async cleanupTempFiles(): Promise<void> {
        try {
            const files = await fs.readdir(this.tempDir);
            let cleaned = 0;
            
            for (const file of files) {
                try {
                    await fs.unlink(path.join(this.tempDir, file));
                    cleaned++;
                } catch (error) {
                    console.warn(`Nu s-a putut șterge fișierul temporar ${file}:`, error);
                }
            }
            
            console.log(`🧹 Curățare completă: ${cleaned} fișiere temporare eliminate`);
            
        } catch (error) {
            console.error('❌ Eroare la curățarea fișierelor temporare:', error);
        }
    }
}

export const pdfGenerationService = new PDFGenerationService();

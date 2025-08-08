import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { folderSettingsService } from './folder.settings.service';

/**
 * Serviciu pentru stocarea locală a fișierelor (înlocuiește Azure Blob Storage pentru versiunea light)
 */
export class LocalStorageService {
    private readonly storageRoot: string;
    private logosPath: string;

    constructor() {
        // Directorul de stocare în backend/uploads (pentru compatibilitate)
        this.storageRoot = path.join(process.cwd(), 'uploads');
        this.logosPath = path.join(this.storageRoot, 'logos');
        
        this.initializeStorage();
    }

    /**
     * Inițializează structura de directoare pentru stocare
     */
    private async initializeStorage(): Promise<void> {
        try {
            // Creează directorul principal de uploads dacă nu există (pentru compatibilitate)
            await fs.mkdir(this.storageRoot, { recursive: true });
            
            // Încearcă să obțină calea pentru logo-uri din setări
            try {
                const folderSettings = await folderSettingsService.getFolderSettings();
                this.logosPath = folderSettings.logosPath;
                console.log(`📁 Logo path din setări: ${this.logosPath}`);
            } catch (error) {
                console.warn('⚠️ Nu s-au putut încărca setările de foldere, se folosește calea implicită');
                this.logosPath = path.join(this.storageRoot, 'logos');
            }
            
            // Creează directorul pentru logos dacă nu există
            await fs.mkdir(this.logosPath, { recursive: true });
            
            console.log('📁 Local storage inițializat cu succes');
            console.log(`   📂 Storage root: ${this.storageRoot}`);
            console.log(`   🏢 Logos path: ${this.logosPath}`);
        } catch (error) {
            console.error('❌ Eroare la inițializarea local storage:', error);
            throw error;
        }
    }

    /**
     * Actualizează calea pentru logo-uri din setările de foldere
     */
    async updateLogosPath(): Promise<void> {
        try {
            const folderSettings = await folderSettingsService.getFolderSettings();
            const newLogosPath = folderSettings.logosPath;
            
            console.log(`📁 Verificare cale logos: actuală="${this.logosPath}", nouă="${newLogosPath}"`);
            
            if (newLogosPath !== this.logosPath) {
                console.log(`📁 Actualizare cale logos: ${this.logosPath} -> ${newLogosPath}`);
                this.logosPath = newLogosPath;
                
                // Creează noul director dacă nu există
                await fs.mkdir(this.logosPath, { recursive: true });
                console.log(`✅ Calea pentru logo-uri a fost actualizată: ${this.logosPath}`);
            } else {
                console.log(`📁 Calea pentru logo-uri este deja actualizată: ${this.logosPath}`);
            }
        } catch (error) {
            console.error('❌ Eroare la actualizarea căii pentru logo-uri:', error);
        }
    }

    /**
     * Salvează logo-ul unei companii local
     */
    async saveCompanyLogo(companyId: string, fileBuffer: Buffer, originalName: string, mimeType: string): Promise<string> {
        try {
            // Actualizează calea pentru logo-uri din setări
            await this.updateLogosPath();
            
            // Creează directorul pentru compania specifică
            const companyLogoPath = path.join(this.logosPath, companyId);
            await fs.mkdir(companyLogoPath, { recursive: true });

            // Generează numele fișierului
            const fileExtension = path.extname(originalName);
            const fileName = `logo${fileExtension}`;
            const fullPath = path.join(companyLogoPath, fileName);

            // Salvează fișierul
            await fs.writeFile(fullPath, fileBuffer);

            // Generează URL-ul relativ pentru accesare
            const relativePath = path.join('logos', companyId, fileName).replace(/\\/g, '/');
            
            console.log(`📁 Logo salvat: ${fullPath}`);
            console.log(`🔗 URL relativ: ${relativePath}`);

            return relativePath;
        } catch (error) {
            console.error('❌ Eroare la salvarea logo-ului:', error);
            throw error;
        }
    }

    /**
     * Șterge logo-ul unei companii
     */
    async deleteCompanyLogo(companyId: string): Promise<boolean> {
        try {
            // Actualizează calea pentru logo-uri din setări
            await this.updateLogosPath();
            
            const companyLogoPath = path.join(this.logosPath, companyId);
            
            // Verifică dacă directorul există
            try {
                await fs.access(companyLogoPath);
            } catch {
                console.log(`📁 Directorul logo pentru compania ${companyId} nu există`);
                return true; // Nu e o eroare dacă nu există
            }

            // Șterge toate fișierele din directorul companiei
            const files = await fs.readdir(companyLogoPath);
            for (const file of files) {
                await fs.unlink(path.join(companyLogoPath, file));
            }

            // Șterge directorul
            await fs.rmdir(companyLogoPath);

            console.log(`📁 Logo șters pentru compania ${companyId}`);
            return true;
        } catch (error) {
            console.error(`❌ Eroare la ștergerea logo-ului pentru ${companyId}:`, error);
            return false;
        }
    }

    /**
     * Verifică dacă un logo există pentru o companie
     */
    async hasCompanyLogo(companyId: string): Promise<boolean> {
        try {
            // Actualizează calea pentru logo-uri din setări
            await this.updateLogosPath();
            
            const companyLogoPath = path.join(this.logosPath, companyId);
            const files = await fs.readdir(companyLogoPath);
            return files.some(file => file.startsWith('logo.'));
        } catch {
            return false;
        }
    }

    /**
     * Obține calea completă către un fișier logo
     */
    getLogoFullPath(relativePath: string): string {
        // Pentru backward compatibility, folosim încă storageRoot pentru căile relative
        if (relativePath.startsWith('logos/')) {
            // Dacă este o cale relativă în format nou, folosim calea configurată
            const pathParts = relativePath.split('/');
            pathParts.shift(); // Elimină 'logos'
            return path.join(this.logosPath, ...pathParts);
        }
        return path.join(this.storageRoot, relativePath);
    }

    /**
     * Obține URL-ul public pentru un logo
     */
    getLogoPublicUrl(relativePath: string): string {
        return `/api/storage/local/${relativePath.replace(/\\/g, '/')}`;
    }

    /**
     * Listează toate logo-urile existente
     */
    async listCompanyLogos(): Promise<{ companyId: string, logoPath: string }[]> {
        try {
            // Actualizează calea pentru logo-uri din setări
            await this.updateLogosPath();
            
            const results: { companyId: string, logoPath: string }[] = [];
            const companies = await fs.readdir(this.logosPath);

            for (const companyId of companies) {
                const companyPath = path.join(this.logosPath, companyId);
                const stat = await fs.stat(companyPath);
                
                if (stat.isDirectory()) {
                    const files = await fs.readdir(companyPath);
                    const logoFile = files.find(file => file.startsWith('logo.'));
                    
                    if (logoFile) {
                        const relativePath = path.join('logos', companyId, logoFile).replace(/\\/g, '/');
                        results.push({ companyId, logoPath: relativePath });
                    }
                }
            }

            return results;
        } catch (error) {
            console.error('❌ Eroare la listarea logo-urilor:', error);
            return [];
        }
    }

    /**
     * Curăță fișierele temporare mai vechi de o oră
     */
    async cleanupTempFiles(): Promise<void> {
        try {
            const tempPath = path.join(this.storageRoot, 'temp');
            
            try {
                const files = await fs.readdir(tempPath);
                const oneHourAgo = Date.now() - (60 * 60 * 1000); // 1 oră în milisecunde

                for (const file of files) {
                    const filePath = path.join(tempPath, file);
                    const stat = await fs.stat(filePath);
                    
                    if (stat.mtime.getTime() < oneHourAgo) {
                        await fs.unlink(filePath);
                        console.log(`🧹 Fișier temporar șters: ${file}`);
                    }
                }
            } catch (error) {
                // Directorul temp nu există sau e gol - nu e o problemă
            }
        } catch (error) {
            console.error('❌ Eroare la curățarea fișierelor temporare:', error);
        }
    }
}

// Export instanță singleton
export const localStorageService = new LocalStorageService();

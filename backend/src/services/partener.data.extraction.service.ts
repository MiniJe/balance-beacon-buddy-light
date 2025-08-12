import { getDatabase } from '../config/sqlite';
import { Partener } from '../models/Partener';
import { TemplateData } from '../types/TemplateData';

/**
 * Alias pentru compatibilitatea cu codul existent
 */
export type PlaceholderData = TemplateData;

/**
 * Re-export TemplateData pentru ușurința importului
 */
export { TemplateData } from '../types/TemplateData';

/**
 * Interfață pentru datele utilizatorului care generează documentul
 */
export interface UtilizatorData {
    nume?: string;
    functie?: string;
    rol?: string;
    email?: string;
}

/**
 * Serviciu pentru extragerea și formatarea datelor din tabelul Parteneri
 * pentru înlocuirea placeholder-urilor în șabloanele DOCX
 */
export class PartenerDataExtractionService {

    /**
     * Extrage și formatează datele unui partener pentru înlocuirea placeholder-urilor
     */
    async extractPartenerData(
        idPartener: string,
        numarDocument: number,
        dataSold: string,
        utilizatorData: UtilizatorData,
        numarSesiune: string,
        dataEmiterii?: Date
    ): Promise<TemplateData> {
        try {
            console.log(`📋 Extragere date partener (SQLite): ${idPartener}`);
            
            // 1. Obține datele partenerului din baza de date
            const partener = await this.getPartenerById(idPartener);
            
            if (!partener) {
                throw new Error(`Partenerul cu ID ${idPartener} nu a fost găsit`);
            }
            
            // 2. Formatează datele pentru placeholder-uri
            const placeholderData = this.formatPartenerDataForTemplate(
                partener,
                numarDocument,
                dataSold,
                utilizatorData,
                numarSesiune,
                dataEmiterii
            );
            
            console.log(`✅ Date partener formatate: ${partener.numePartener}`);
            return placeholderData;
            
        } catch (error) {
            console.error('❌ Eroare la extragerea datelor partenerului (SQLite):', error);
            throw new Error(`Nu s-au putut extrage datele partenerului: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Extrage datele mai multor parteneri pentru procesare în lot
     */
    async extractMultipleParteneriData(
        parteneriIds: string[],
        numarDocumentStart: number,
        dataSold: string,
        utilizatorData: UtilizatorData,
        numarSesiune: string,
        dataEmiterii?: Date
    ): Promise<Map<string, TemplateData>> {
        console.log(`📋 Extragere date (batch) pentru ${parteneriIds.length} parteneri (SQLite)`);
        
        const rezultat = new Map<string, TemplateData>();
        
        // Procesează fiecare partener
        for (let i = 0; i < parteneriIds.length; i++) {
            const idPartener = parteneriIds[i];
            const numarDocument = numarDocumentStart + i;
            
            try {
                const data = await this.extractPartenerData(
                    idPartener,
                    numarDocument,
                    dataSold,
                    utilizatorData,
                    numarSesiune,
                    dataEmiterii
                );
                
                rezultat.set(idPartener, data);
                
            } catch (err) {
                console.error(`❌ Eroare la partener ${idPartener}:`, err);
            }
        }
        
        console.log(`✅ Batch complet: ${rezultat.size}/${parteneriIds.length} reușite`);
        return rezultat;
    }

    /**
     * Obține un partener din baza de date după ID
     */
    private async getPartenerById(idPartener: string): Promise<Partener | null> {
        try {
            const db = await getDatabase();
            const row = await db.get(`
                SELECT 
                    IdPartener as idPartener,
                    NumePartener as numePartener,
                    CUIPartener as cuiPartener,
                    ONRCPartener as onrcPartener,
                    EmailPartener as emailPartener,
                    ReprezentantPartener as reprezentantPartener,
                    AdresaPartener as adresaPartener,
                    TelefonPartener as telefonPartener,
                    ObservatiiPartener as observatiiPartener,
                    ClientDUC as clientDUC,
                    ClientDL as clientDL,
                    FurnizorDUC as furnizorDUC,
                    FurnizorDL as furnizorDL,
                    PartenerActiv as partenerActiv,
                    DataCrearePartener as dataCrearePartener,
                    DataModificarePartener as dataModificarePartener
                FROM Parteneri
                WHERE IdPartener = ? AND PartenerActiv = 1
                LIMIT 1
            `, [idPartener]);

            if (!row) {
                return null;
            }

            return {
                idPartener: row.idPartener,
                numePartener: row.numePartener || '',
                cuiPartener: row.cuiPartener || '',
                onrcPartener: row.onrcPartener || '',
                emailPartener: row.emailPartener || '',
                reprezentantPartener: row.reprezentantPartener || '',
                adresaPartener: row.adresaPartener || '',
                telefonPartener: row.telefonPartener || '',
                observatiiPartener: row.observatiiPartener || '',
                clientDUC: Boolean(row.clientDUC),
                clientDL: Boolean(row.clientDL),
                furnizorDUC: Boolean(row.furnizorDUC),
                furnizorDL: Boolean(row.furnizorDL),
                partenerActiv: Boolean(row.partenerActiv),
                dataCrearePartener: row.dataCrearePartener,
                dataModificarePartener: row.dataModificarePartener
            };
            
        } catch (error) {
            console.error('❌ Eroare SQLite getPartenerById:', error);
            throw error;
        }
    }

    /**
     * Formatează datele partenerului pentru înlocuirea placeholder-urilor
     */
    private formatPartenerDataForTemplate(
        partener: Partener,
        numarDocument: number,
        dataSold: string,
        utilizatorData: UtilizatorData,
        numarSesiune: string,
        dataEmiterii?: Date
    ): TemplateData {
        const dataEmiteriiFormatata = this.formatDateRomanian(dataEmiterii || new Date());
        const dataSoldFormatata = this.formatDateRomanian(new Date(dataSold));
        return {
            nrDoc: numarDocument.toString(),
            dataEmiterii: dataEmiteriiFormatata,
            companie: partener.numePartener || 'Nume necunoscut',
            cui: partener.cuiPartener || 'CUI nespecificat',
            onrc: partener.onrcPartener || 'ONRC nespecificat',
            dataSold: dataSoldFormatata
        };
    }

    /**
     * Formatează o dată în format românesc (DD.MM.YYYY)
     */
    private formatDateRomanian(date: Date): string {
        return date.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    /**
     * Validează că toate câmpurile obligatorii sunt prezente
     */
    validateTemplateData(data: TemplateData): { valid: boolean; missingFields: string[] } {
        const required: (keyof TemplateData)[] = ['nrDoc','dataEmiterii','companie','cui','dataSold'];
        const missing = required.filter(f => !data[f] || (typeof data[f] === 'string' && (data[f] as string).trim() === ''));
        return { valid: missing.length === 0, missingFields: missing.map(m => m.toString()) };
    }
}

// Export instanța serviciului
export const partenerDataExtractionService = new PartenerDataExtractionService();

// MSSQL-based JurnalDocumenteEmiseService removed in LIGHT version. This is a stub.
import { JurnalDocumenteEmise, CreateJurnalDocumenteEmiseDto, UpdateJurnalDocumenteEmiseDto, JurnalDocumenteEmiseResponse } from '../models/JurnalDocumenteEmise';

/**
 * Serviciu pentru gestionarea jurnalului documentelor emise
 * Oferă funcționalități pentru evidența documentelor cu numerotare secvențială
 */
export class JurnalDocumenteEmiseService {
    async createDocument(): Promise<JurnalDocumenteEmise> { throw new Error('JurnalDocumenteEmiseService (MSSQL) eliminat'); }
    async updateDocument(): Promise<JurnalDocumenteEmise> { throw new Error('Serviciu eliminat'); }
    async getDocumentById(): Promise<JurnalDocumenteEmise | null> { return null; }
    async getNextRegistrationNumber(): Promise<number> { return 0; }
    async getAllDocuments(): Promise<JurnalDocumenteEmiseResponse> { return { jurnal: [], total: 0, pagina: 1, totalPagini: 0 }; }
}

export const jurnalDocumenteEmiseService = new JurnalDocumenteEmiseService();
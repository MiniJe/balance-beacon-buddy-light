import { Request, Response } from 'express';
import sql from 'mssql';
import { pool } from '../config/azure';
import crypto from 'crypto';
import { 
    JurnalCereriConfirmare, 
    CreateJurnalCereriConfirmareDto, 
    UpdateJurnalCereriConfirmareDto,
    JurnalCereriConfirmareResponse,
    StatisticiCereriConfirmare,
    FilterJurnalCereriConfirmareDto
} from '../models/JurnalCereriConfirmare.Real';

/**
 * Serviciu pentru gestionarea jurnalului cererilor de confirmare
 * Folosește modelul Real cu structura corectă din baza de date
 */
export class JurnalCereriConfirmareService {
    
    /**
     * Convertește un rând din baza de date la interfața JurnalCereriConfirmare
     */
    private formatCerereFromDB(dbRow: any): JurnalCereriConfirmare {
        return {
            IdJurnal: dbRow.IdJurnal,
            IdPartener: dbRow.IdPartener,
            IdSetariCompanie: dbRow.IdSetariCompanie,
            DataCerere: dbRow.DataCerere?.toISOString?.() || dbRow.DataCerere,
            NumeFisier: dbRow.NumeFisier,
            URLFisier: dbRow.URLFisier,
            Stare: dbRow.Stare,
            LotId: dbRow.LotId,
            CreatDe: dbRow.CreatDe,
            TrimisDe: dbRow.TrimisDe,
            DataTrimitere: dbRow.DataTrimitere?.toISOString?.() || dbRow.DataTrimitere,
            URLFisierSemnat: dbRow.URLFisierSemnat,
            DataIncarcareSemnatura: dbRow.DataIncarcareSemnatura?.toISOString?.() || dbRow.DataIncarcareSemnatura,
            Observatii: dbRow.Observatii,
            HashDocument: dbRow.HashDocument,
            HashTranzactieBlockchain: dbRow.HashTranzactieBlockchain,
            StareBlockchain: dbRow.StareBlockchain,
            TimestampBlockchain: dbRow.TimestampBlockchain,
            ReteaBlockchain: dbRow.ReteaBlockchain
        };
    }

    /**
     * Creează o nouă cerere de confirmare în jurnal
     */
    async createCerereConfirmare(cerereData: CreateJurnalCereriConfirmareDto): Promise<JurnalCereriConfirmare> {
        try {
            const request = pool.request();
            
            const query = `
                INSERT INTO JurnalCereriConfirmare (
                    IdPartener, IdSetariCompanie, DataCerere, NumeFisier, URLFisier,
                    Stare, LotId, CreatDe, TrimisDe, DataTrimitere,
                    URLFisierSemnat, DataIncarcareSemnatura, Observatii, HashDocument,
                    HashTranzactieBlockchain, StareBlockchain, TimestampBlockchain, ReteaBlockchain
                )
                OUTPUT INSERTED.*
                VALUES (
                    @IdPartener, @IdSetariCompanie, @DataCerere, @NumeFisier, @URLFisier,
                    @Stare, @LotId, @CreatDe, @TrimisDe, @DataTrimitere,
                    @URLFisierSemnat, @DataIncarcareSemnatura, @Observatii, @HashDocument,
                    @HashTranzactieBlockchain, @StareBlockchain, @TimestampBlockchain, @ReteaBlockchain
                )
            `;
            
            request.input('IdPartener', sql.UniqueIdentifier, cerereData.IdPartener);
            request.input('IdSetariCompanie', sql.UniqueIdentifier, cerereData.IdSetariCompanie || null);
            request.input('DataCerere', sql.DateTime2, new Date(cerereData.DataCerere));
            request.input('NumeFisier', sql.NVarChar(255), cerereData.NumeFisier || null);
            request.input('URLFisier', sql.NVarChar(500), cerereData.URLFisier || null);
            request.input('Stare', sql.NVarChar(50), cerereData.Stare || 'in_asteptare');
            request.input('LotId', sql.UniqueIdentifier, cerereData.LotId || null);
            request.input('CreatDe', sql.UniqueIdentifier, cerereData.CreatDe || null);
            request.input('TrimisDe', sql.UniqueIdentifier, cerereData.TrimisDe || null);
            request.input('DataTrimitere', sql.DateTime2, cerereData.DataTrimitere ? new Date(cerereData.DataTrimitere) : null);
            request.input('URLFisierSemnat', sql.NVarChar(500), cerereData.URLFisierSemnat || null);
            request.input('DataIncarcareSemnatura', sql.DateTime2, cerereData.DataIncarcareSemnatura ? new Date(cerereData.DataIncarcareSemnatura) : null);
            request.input('Observatii', sql.NVarChar(1000), cerereData.Observatii || null);
            request.input('HashDocument', sql.VarChar(128), cerereData.HashDocument || null);
            request.input('HashTranzactieBlockchain', sql.VarChar(100), cerereData.HashTranzactieBlockchain || null);
            request.input('StareBlockchain', sql.NVarChar(50), cerereData.StareBlockchain || null);
            request.input('TimestampBlockchain', sql.DateTime2, cerereData.TimestampBlockchain ? new Date(cerereData.TimestampBlockchain) : null);
            request.input('ReteaBlockchain', sql.NVarChar(50), cerereData.ReteaBlockchain || null);
            
            const result = await request.query(query);
            
            if (result.recordset.length === 0) {
                throw new Error('Cererea nu a putut fi creată');
            }
            
            const cerere = this.formatCerereFromDB(result.recordset[0]);
            
            console.log(`✅ Cerere de confirmare creată cu succes: ${cerere.IdJurnal} pentru partenerul ${cerere.IdPartener}`);
            return cerere;
            
        } catch (error) {
            console.error('Eroare la crearea cererii de confirmare:', error);
            throw new Error(`Eroare la crearea cererii de confirmare: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Actualizează statusul unei cereri de confirmare
     */
    async updateCerereConfirmare(idCerere: number, updateData: UpdateJurnalCereriConfirmareDto): Promise<JurnalCereriConfirmare> {
        const request = pool.request();
        
        try {
            // Construim query-ul UPDATE dinamic
            const setClauses: string[] = [];
            
            if (updateData.Stare) {
                setClauses.push('Stare = @stare');
                request.input('stare', sql.VarChar(50), updateData.Stare);
            }

            if (updateData.DataTrimitere) {
                setClauses.push('DataTrimitere = @dataTrimitere');
                request.input('dataTrimitere', sql.DateTime2, updateData.DataTrimitere);
            }

            if (updateData.URLFisierSemnat) {
                setClauses.push('URLFisierSemnat = @urlFisierSemnat');
                request.input('urlFisierSemnat', sql.NVarChar(500), updateData.URLFisierSemnat);
            }

            if (updateData.DataIncarcareSemnatura) {
                setClauses.push('DataIncarcareSemnatura = @dataIncarcareSemnatura');
                request.input('dataIncarcareSemnatura', sql.DateTime2, updateData.DataIncarcareSemnatura);
            }

            if (updateData.Observatii !== undefined) {
                setClauses.push('Observatii = @observatii');
                request.input('observatii', sql.NVarChar(1000), updateData.Observatii);
            }

            if (updateData.HashDocument !== undefined) {
                setClauses.push('HashDocument = @hashDocument');
                request.input('hashDocument', sql.VarChar(128), updateData.HashDocument);
            }

            if (updateData.HashTranzactieBlockchain !== undefined) {
                setClauses.push('HashTranzactieBlockchain = @hashTranzactieBlockchain');
                request.input('hashTranzactieBlockchain', sql.VarChar(100), updateData.HashTranzactieBlockchain);
            }

            if (updateData.StareBlockchain !== undefined) {
                setClauses.push('StareBlockchain = @stareBlockchain');
                request.input('stareBlockchain', sql.VarChar(50), updateData.StareBlockchain);
            }

            if (updateData.TimestampBlockchain !== undefined) {
                setClauses.push('TimestampBlockchain = @timestampBlockchain');
                request.input('timestampBlockchain', sql.DateTime2, updateData.TimestampBlockchain);
            }

            if (updateData.ReteaBlockchain !== undefined) {
                setClauses.push('ReteaBlockchain = @reteaBlockchain');
                request.input('reteaBlockchain', sql.VarChar(50), updateData.ReteaBlockchain);
            }

            if (setClauses.length === 0) {
                throw new Error('Nu au fost furnizate date pentru actualizare');
            }
            
            const query = `
                UPDATE JurnalCereriConfirmare 
                SET ${setClauses.join(', ')}
                OUTPUT INSERTED.*
                WHERE IdJurnal = @idCerere
            `;
            
            request.input('idCerere', sql.Int, idCerere);
            const result = await request.query(query);
            
            if (result.recordset.length === 0) {
                throw new Error('Cererea nu a fost găsită sau nu a putut fi actualizată');
            }
            
            const cerere = this.formatCerereFromDB(result.recordset[0]);
            console.log(`Cerere de confirmare actualizată cu succes: ${cerere.IdJurnal}`);
            return cerere;
            
        } catch (error) {
            console.error('Eroare la actualizarea cererii de confirmare:', error);
            throw new Error(`Eroare la actualizarea cererii de confirmare: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }
}
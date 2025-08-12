/**
 * Model pentru tabelul JurnalCereriConfirmare
 * Varianta LIGHT: câmpurile blockchain eliminate.
 */

export interface JurnalCereriConfirmare {
    IdJurnal: number; // INT IDENTITY - cheia primară
    IdPartener: string; // UNIQUEIDENTIFIER - legătură cu tabelul Parteneri
    IdSetariCompanie?: string | null; // UNIQUEIDENTIFIER - legătură cu SetariCompanie
    DataCerere: string; // DATETIME - data cererii
    NumeFisier: string; // NVARCHAR - numele fișierului generat
    URLFisier?: string | null; // NVARCHAR - URL sau cale către fișier
    Stare: string; // NVARCHAR - starea cererii (trimisa, confirmata, etc.)
    LotId?: string | null; // NVARCHAR - identificator lot pentru grupare
    CreatDe?: string | null; // NVARCHAR - utilizator care a creat cererea
    TrimisDe?: string | null; // NVARCHAR - utilizator care a trimis cererea
    DataTrimitere?: string | null; // DATETIME - data trimiterii
    URLFisierSemnat?: string | null; // NVARCHAR - URL către fișierul semnat
    DataIncarcareSemnatura?: string | null; // DATETIME - data încărcării semnăturii
    Observatii?: string | null; // NVARCHAR - observații
    HashDocument?: string | null; // NVARCHAR - hash-ul documentului
    // HashTranzactieBlockchain?: string | null; // NVARCHAR - hash tranzacție blockchain
    // StareBlockchain?: string | null; // NVARCHAR - starea blockchain
    // TimestampBlockchain?: number | null; // BIGINT - timestamp blockchain
    // ReteaBlockchain?: string | null; // NVARCHAR - rețeaua blockchain folosită
}

/**
 * DTO pentru crearea unei noi cereri de confirmare
 */
export interface CreateJurnalCereriConfirmareDto {
    IdPartener: string; // UNIQUEIDENTIFIER - ID partener
    IdSetariCompanie?: string; // UNIQUEIDENTIFIER - ID setări companie
    DataCerere: string; // DATETIME - data cererii
    NumeFisier: string; // NVARCHAR - numele fișierului generat
    URLFisier?: string; // NVARCHAR - URL către fișier
    Stare: string; // NVARCHAR - starea inițială (ex: 'generata', 'trimisa')
    LotId?: string; // NVARCHAR - identificator sesiune/lot
    CreatDe: string; // NVARCHAR - utilizator care creează
    TrimisDe?: string; // NVARCHAR - utilizator care trimite
    DataTrimitere?: string; // DATETIME - data trimiterii
    URLFisierSemnat?: string; // NVARCHAR - URL fișier semnat
    DataIncarcareSemnatura?: string; // DATETIME - data încărcării semnăturii
    Observatii?: string; // NVARCHAR - observații
    HashDocument?: string; // NVARCHAR - hash document
    // (blockchain fields removed)
}

/**
 * DTO pentru actualizarea unei cereri
 */
export interface UpdateJurnalCereriConfirmareDto {
    Stare?: string; // NVARCHAR - starea cererii
    TrimisDe?: string; // NVARCHAR - utilizator care a trimis
    DataTrimitere?: string; // DATETIME - data trimiterii
    URLFisierSemnat?: string; // NVARCHAR - URL fișier semnat
    DataIncarcareSemnatura?: string; // DATETIME - data încărcării semnăturii
    Observatii?: string; // NVARCHAR - observații
    HashDocument?: string; // NVARCHAR - hash document
    // (blockchain fields removed)
}

/**
 * DTO pentru răspunsul API
 */
export interface JurnalCereriConfirmareResponse {
    jurnal: JurnalCereriConfirmare[];
    total: number;
    pagina: number;
    totalPagini: number;
}

/**
 * Interface pentru statistici cereri confirmare
 */
export interface StatisticiCereriConfirmare {
    totalCereri: number;
    cereriTrimise: number;
    cereriConfirmate: number;
    cereriRefuzate: number;
    cereriExpirate: number;
    cereriAnulate: number;
    rataSucces: number; // procentaj
    timpMediuRaspuns: number; // în ore
}

/**
 * DTO pentru filtrare și căutare
 */
export interface FilterJurnalCereriConfirmareDto {
    IdPartener?: string;
    IdSetariCompanie?: string;
    Stare?: string;
    LotId?: string;
    CreatDe?: string;
    TrimisDe?: string;
    dataInceput?: string;
    dataSfarsit?: string;
    HashDocument?: string;
    // StareBlockchain?: string; // removed
}

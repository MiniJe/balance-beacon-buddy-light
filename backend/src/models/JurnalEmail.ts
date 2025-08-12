export interface JurnalEmail {
    IdJurnalEmail: string;
    
    // Informații de bază despre email
    IdPartener?: string;
    IdSablon?: string;  // Modificat de la number la string pentru UNIQUEIDENTIFIER
    EmailDestinatar: string;
    SubiectEmail: string;
    ContinutEmail?: string;
    TipEmail: 'CONFIRMARE' | 'REMINDER' | 'TEST' | 'GENERAL';
    
    // Informații despre trimitere
    DataTrimitere: Date;
    StatusTrimitere: 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRY' | 'RESPONDED';
    MesajEroare?: string;
    IdMessageEmail?: string;
    
    // Informații despre lot/batch și context
    IdLot?: string;
    IdCerereConfirmare?: string;
    dataSold?: string; // Data pentru care se face cererea de confirmare (din JOIN cu JurnalCereriConfirmare)
    PriorityLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    
    // Informații despre expeditor
    NumeExpeditor?: string;
    EmailExpeditor?: string;
    
    // Informații despre destinatar
    NumeDestinatar?: string;
    TipDestinatar?: 'PARTENER' | 'CONTABIL' | 'UTILIZATOR' | 'EXTERN';
    
    // Informații suplimentare
    EmailCC?: string;
    EmailBCC?: string;
    EmailReplyTo?: string;
    Atașamente?: string; // JSON string
    
    // Informații despre încercări de trimitere
    NumarIncercari: number;
    DataUltimaIncercare?: Date;
    DataUrmatoareaIncercare?: Date;
    MaximIncercari: number;
    
    // Informații despre citire și răspuns
    DataCitire?: Date;
    DataRaspuns?: Date;
    RaspunsEmail?: string;
    TipRaspuns?: 'CONFIRMED' | 'DISPUTED' | 'CORRECTIONS' | 'GENERAL_RESPONSE';
    StatusRaspuns?: 'PENDING' | 'RECEIVED' | 'PROCESSED';
    
    // Securitate (hash integritate email)
    HashEmail?: string;
    
    // Audit și tracking
    CreatLa: Date;
    CreatDe: string;
    ModificatLa?: Date;
    ModificatDe?: string;
    
    // Archivare și retenție
    EsteProgramatPentruStergere: boolean;
    DataStergere?: Date;
    MotivarStergere?: string;
}

export interface CreateJurnalEmailRequest {
    // Informații obligatorii
    EmailDestinatar: string;
    SubiectEmail: string;
    ContinutEmail?: string;
    TipEmail: JurnalEmail['TipEmail'];
    CreatDe: string;
    
    // Informații opționale
    IdPartener?: string;
    IdSablon?: string;  // Modificat de la number la string pentru UNIQUEIDENTIFIER
    IdLot?: string;
    IdCerereConfirmare?: string;
    dataSold?: string; // Data pentru care se face cererea de confirmare
    PriorityLevel?: JurnalEmail['PriorityLevel'];
    
    // Informații despre expeditor
    NumeExpeditor?: string;
    EmailExpeditor?: string;
    
    // Informații despre destinatar
    NumeDestinatar?: string;
    TipDestinatar?: JurnalEmail['TipDestinatar'];
    
    // Informații suplimentare
    EmailCC?: string;
    EmailBCC?: string;
    EmailReplyTo?: string;
    Atașamente?: string;
    
    // Configurare încercări
    MaximIncercari?: number;
}

export interface UpdateJurnalEmailRequest {
    IdJurnalEmail: string;
    
    // Câmpuri care pot fi actualizate
    StatusTrimitere?: JurnalEmail['StatusTrimitere'];
    MesajEroare?: string;
    IdMessageEmail?: string;
    
    // Informații despre încercări
    NumarIncercari?: number;
    DataUltimaIncercare?: Date;
    DataUrmatoareaIncercare?: Date;
    
    // Informații despre citire și răspuns
    DataCitire?: Date;
    DataRaspuns?: Date;
    RaspunsEmail?: string;
    
    // Hash integritate
    HashEmail?: string;
    
    // Audit
    ModificatDe: string;
}

export interface JurnalEmailFilters {
    // Filtrare după date
    DataTrimitereStart?: Date;
    DataTrimitereEnd?: Date;
    
    // Filtrare după status și tip
    StatusTrimitere?: JurnalEmail['StatusTrimitere'][];
    TipEmail?: JurnalEmail['TipEmail'][];
    
    // Filtrare după entități
    IdPartener?: string;
    IdLot?: string;
    IdCerereConfirmare?: string;
    
    // Filtrare după email
    EmailDestinatar?: string;
    TipDestinatar?: JurnalEmail['TipDestinatar'][];
    
    // Filtrare după prioritate
    PriorityLevel?: JurnalEmail['PriorityLevel'][];
    
    // Paginare
    offset?: number;
    limit?: number;
    
    // Sortare
    sortBy?: 'DataTrimitere' | 'StatusTrimitere' | 'PriorityLevel' | 'CreatLa';
    sortOrder?: 'ASC' | 'DESC';
}

export interface JurnalEmailStats {
    totalEmailuri: number;
    emailuriTrimise: number;
    emailuriEsuate: number;
    emailuriPending: number;
    emailuriRetry: number;
    
    // Statistici pe tipuri
    statisticiTipEmail: {
        [key in JurnalEmail['TipEmail']]: number;
    };
    
    // Statistici pe prioritate
    statisticiPrioritate: {
        [key in JurnalEmail['PriorityLevel']]: number;
    };
}

export interface JurnalEmailResponse {
    success: boolean;
    data?: JurnalEmail | JurnalEmail[];
    message?: string;
    error?: string;
    stats?: JurnalEmailStats;
    pagination?: {
        total: number;
        offset: number;
        limit: number;
        hasMore: boolean;
    };
}

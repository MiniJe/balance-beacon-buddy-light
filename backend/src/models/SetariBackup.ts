// Model pentru tabelul SetariBackup
// Balance Beacon Buddy - TypeScript Model

export interface SetariBackup {
    ID?: number;
    BackupID: string;
    TipBackup: 'sql' | 'blob' | 'full';
    StatusBackup: 'in_progress' | 'completed' | 'failed' | 'partial';
    
    // Informații temporale
    DataCreare: Date;
    DataFinalizare?: Date;
    DurataSecunde?: number;
    
    // Informații despre backup SQL
    NumeTabeleSQLBackup?: string; // JSON string
    DimensiuneSQLBytes?: number;
    NumarInregistrariSQL?: number;
    
    // Informații despre backup blob
    NumarBloburi?: number;
    DimensiuneBlobBytes?: number;
    NumeBloburi?: string; // JSON string
    
    // Locația backup-ului
    CaleBackup: string;
    ContainerBackup: string;
    
    // Mesaje și erori
    MesajSucces?: string;
    MesajEroare?: string;
    
    // Metadate suplimentare
    ConfiguratieBackup?: string; // JSON string
    ManifestBackup?: string; // JSON string
    
    // Setări pentru backup automat
    EsteBackupAutomat: boolean;
    IntervalZile?: number;
    ProximulBackupAutomat?: Date;
    
    // Audit
    CreatDe?: string;
    ModificatLa?: Date;
    ModificatDe?: string;
}

// Interface pentru crearea unui nou backup
export interface CreateBackupRequest {
    TipBackup: 'sql' | 'blob' | 'full';
    CreatDe?: string;
    ConfiguratieBackup?: any; // Obiect care va fi serializat în JSON
}

// Interface pentru actualizarea unui backup
export interface UpdateBackupRequest {
    StatusBackup?: 'in_progress' | 'completed' | 'failed' | 'partial';
    DataFinalizare?: Date;
    DurataBackup?: number;
    DimensiuneBackup?: number;
    DetaliiEroare?: string;
    ConfiguratieBackup?: any; // Obiect care va fi serializat în JSON
    
    // SQL backup info
    NumeTabeleSQLBackup?: string[];
    DimensiuneSQLBytes?: number;
    NumarInregistrariSQL?: number;
    
    // Blob backup info
    NumarBloburi?: number;
    DimensiuneBlobBytes?: number;
    NumeBloburi?: string[];
    
    // Mesaje
    MesajSucces?: string;
    MesajEroare?: string;
    ManifestBackup?: any; // Obiect care va fi serializat în JSON
    ModificatDe?: string;
}

// Interface pentru răspunsurile API
export interface BackupHistoryResponse {
    backups: SetariBackup[];
    pagination: {
        currentPage: number;
        pageSize: number;
        totalRecords: number;
        totalPages: number;
    };
}

export interface BackupStatsResponse {
    totalBackups: number;
    backupuriReussite: number;
    backupuriEsuate: number;
    backupuriInProgress: number;
    backupuriAutomate: number;
    durataMediaBackup: number;
    dimensiuneTotalBackups: number;
    ultimulBackup?: string;
}

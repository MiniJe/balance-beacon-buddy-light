export interface Contabil {
    IdContabil: string;
    NumeContabil: string;
    PrenumeContabil: string;
    EmailContabil: string;
    TelefonContabil?: string;
    DepartmentContabil?: string;
    RolContabil: string;
    PermisiuniAcces?: string;
    DatăAngajareContabil?: Date;
    StatusContabil: string;
    DataUltimeiLogări?: Date;
    DatăCreareContabil: Date;
    ContabilCreatDe: string;
    DataActualizării?: Date;
    ActualizatDE?: string;
    ParolaHashContabil?: string; // Pentru autentificare
    SchimbareParolaLaLogare?: boolean; // Pentru prima logare
}

export interface PermisiuniContabil {
    IdPermisiune?: string;
    PoateModificaParteneri: boolean;
    PoateAdaugaParteneri: boolean;
    PoateVedeaRapoarte: boolean;
    PoateModificaSabloane: boolean;
    PoateCreaCereri: boolean;
    PoateAdaugaUtilizatori: boolean;
    PoateModificaSetari: boolean;
}

export interface CreateContabilDto {
    NumeContabil: string;
    PrenumeContabil: string;
    EmailContabil: string;
    TelefonContabil?: string;
    DepartmentContabil?: string;
    RolContabil: string;
    DatăAngajareContabil?: Date;
    StatusContabil: string;
    PermisiuniAcces?: {
        PoateModificaParteneri: boolean;
        PoateAdaugaParteneri: boolean;
        PoateVedeaRapoarte: boolean;
        PoateModificaSabloane: boolean;
        PoateCreaCereri: boolean;
        PoateAdaugaUtilizatori: boolean;
        PoateModificaSetari: boolean;
    };
    Parola?: string;  // parola în text clar, va fi hash-uită înainte de salvare
}

export interface ContabilResponse {
    IdContabil: string;
    NumeContabil: string;
    PrenumeContabil: string;
    EmailContabil: string;
    TelefonContabil?: string;
    DepartmentContabil?: string;
    RolContabil: string;
    StatusContabil: string;
    DataUltimeiLogări?: Date;
    DatăCreareContabil: Date;
    ContabilCreatDe: string;
    DataActualizării?: Date;
    ActualizatDE?: string;
    SchimbareParolaLaLogare?: boolean;
    PermisiuniAcces?: PermisiuniContabil;
    PermisiuniContabil?: PermisiuniContabil; // Pentru compatibilitate cu frontend
}

export interface ContabilLoginDto {
    EmailContabil: string;
    Parola: string;
}

export interface ResetareParolaContabilDto {
    IdContabil: string;
}

export interface SchimbareParolaContabilDto {
    IdContabil: string;
    ParolaVeche: string;
    ParolaNoua: string;
}

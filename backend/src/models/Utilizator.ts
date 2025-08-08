export interface Utilizator {
    IdUtilizatori: string;  // uniqueidentifier în SQL = string în TS
    NumeUtilizator: string;
    EmailUtilizator: string;
    ParolaHash: string;
    RolUtilizator: string;
    UtilizatorActiv: boolean;
    DataCreareUtilizator: Date;
    DataModificareUtilizator: Date | null;
    SchimbareParolaLaLogare: boolean;
}

export interface CreateUtilizatorDto {
    NumeUtilizator: string;
    EmailUtilizator: string;
    Parola: string;  // parola în text clar, va fi hash-uită înainte de salvare
    RolUtilizator: string;
    SchimbareParolaLaLogare?: boolean;
}

export interface LoginDto {
    EmailUtilizator: string;
    Parola: string;
}

export interface UtilizatorResponse {
    IdUtilizatori: string;
    NumeUtilizator: string;
    EmailUtilizator: string;
    RolUtilizator: string;
    token: string;
}

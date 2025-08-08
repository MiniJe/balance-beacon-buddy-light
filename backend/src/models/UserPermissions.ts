export interface UserPermissions {
    idPermisiune?: string;
    idUtilizator: string;
    poateModificaParteneri: boolean;
    poateAdaugaParteneri: boolean;
    poateVedeaRapoarte: boolean;
    poateModificaSabloane: boolean;
    poateCreaCereri: boolean;
    poateAdaugaUtilizatori: boolean;
    poateModificaSetari: boolean;
    dataCreare?: Date;
    dataModificare?: Date;
}

export interface UserWithPermissions {
    idUtilizator: string;
    numeUtilizator: string;
    emailUtilizator: string;
    rolUtilizator: string;
    utilizatorActiv: boolean;
    dataCreare: Date;
    dataModificare?: Date;
    schimbareParolaLaLogare: boolean;
    permissions?: UserPermissions;
}

export interface CreateAccountDto {
    numeUtilizator: string;
    emailUtilizator: string;
    rolUtilizator: string;
    permissions: {
        poateModificaParteneri: boolean;
        poateAdaugaParteneri: boolean;
        poateVedeaRapoarte: boolean;
        poateModificaSabloane: boolean;
        poateCreaCereri: boolean;
        poateAdaugaUtilizatori: boolean;
        poateModificaSetari: boolean;
    };
}

export interface AccountResponseDto {
    idUtilizator: string;
    numeUtilizator: string;
    emailUtilizator: string;
    rolUtilizator: string;
    permissions: {
        poateModificaParteneri: boolean;
        poateAdaugaParteneri: boolean;
        poateVedeaRapoarte: boolean;
        poateModificaSabloane: boolean;
        poateCreaCereri: boolean;
        poateAdaugaUtilizatori: boolean;
        poateModificaSetari: boolean;
    };
}

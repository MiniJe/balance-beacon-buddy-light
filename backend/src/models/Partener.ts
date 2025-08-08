export interface Partener {
    idPartener: string;  // uniqueidentifier in SQL
    numePartener: string;
    cuiPartener: string;
    onrcPartener: string;
    emailPartener: string;
    reprezentantPartener?: string;
    clientDUC?: boolean;
    furnizorDUC?: boolean;
    clientDL?: boolean;
    furnizorDL?: boolean;
    adresaPartener?: string;
    telefonPartener?: string;
    observatiiPartener?: string;
    partenerActiv: boolean;
    dataCrearePartener?: Date;
    dataModificarePartener?: Date;
}

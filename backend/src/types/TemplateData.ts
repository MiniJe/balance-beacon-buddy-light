/**
 * Interface pentru datele template-urilor de confirmare sold
 * Bazată pe analiza reală a template-urilor DOCX din Azure Storage
 * 
 * Template-uri analizate:
 * - document_template_clienți-dl.docx
 * - document_template_clienți-duc.docx
 * - document_template_furnizori-dl.docx
 * - document_template_furnizori-duc.docx
 * 
 * Data generării: ${new Date().toISOString()}
 */
export interface TemplateData {
  /** Numărul documentului de confirmare */
  nrDoc: string;
  
  /** Data emiterii documentului (format DD.MM.YYYY) */
  dataEmiterii: string;
  
  /** Data pentru care se solicită soldul (format DD.MM.YYYY) */
  dataSold: string;
  
  /** Numele companiei debitor/client */
  companie: string;
  
  /** Codul unic de identificare (CUI) al companiei */
  cui: string;
  
  /** Numărul de înregistrare la ONRC */
  onrc: string;
}

/**
 * Mapare între proprietățile interfației și placeholder-urile din template
 */
export const TEMPLATE_PLACEHOLDERS = {
  nrDoc: '{ NR.DOC. }',
  dataEmiterii: '{ DATA-EMITERII }',
  dataSold: '{ DATA-SOLD }',
  companie: '{ COMPANIE }',
  cui: '{ C.U.I . }',
  onrc: '{ O.N.R.C. }'
} as const;

/**
 * Lista tuturor placeholder-urilor identificate în template-uri
 */
export const ALL_PLACEHOLDERS = [
  '{ NR.DOC. }',
  '{ DATA-EMITERII }',
  '{ DATA-SOLD }',
  '{ COMPANIE }',
  '{ C.U.I . }',
  '{ O.N.R.C. }'
] as const;

/**
 * Tipuri de template-uri disponibile
 */
export enum TemplateType {
  CLIENTI_DL = 'document_template_clienți-dl.docx',
  CLIENTI_DUC = 'document_template_clienți-duc.docx', 
  FURNIZORI_DL = 'document_template_furnizori-dl.docx',
  FURNIZORI_DUC = 'document_template_furnizori-duc.docx'
}

/**
 * Configurație pentru containerul Azure Storage cu template-uri
 */
export const TEMPLATE_CONTAINER_CONFIG = {
  containerName: 'templates',
  blobPrefix: '',
  templates: Object.values(TemplateType)
} as const;

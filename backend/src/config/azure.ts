import path from 'path';

/**
 * ⚠️ VERSIUNEA LIGHT - AZURE DEPRECAT
 * 
 * Acest fișier oferă export-uri goale pentru compatibilitate temporară.
 * TODO: Eliminare completă după ce toate importurile au fost curățate.
 */

// Export compatibilitate pentru Azure SQL (nu mai este folosit în versiunea LIGHT)
export const pool: any = null;

// Export compatibilitate pentru Azure Blob Storage (nu mai este folosit în versiunea LIGHT)  
export const backupBlobServiceClient: any = null;
export const backupContainerName: string = '';
export const blobServiceClient: any = null;
export const containerName: string = '';
export const templatesContainerName: string = '';

// Funcții de compatibilitate (nu fac nimic în versiunea LIGHT)
export const initializePool = async (): Promise<void> => {
    console.warn('⚠️ Azure SQL dezactivat în versiunea LIGHT. Folosește SQLite.');
    return Promise.resolve();
};

export const testConnection = async (): Promise<boolean> => {
    console.warn('⚠️ Azure SQL dezactivat în versiunea LIGHT. Folosește SQLite.');
    return Promise.resolve(false);
};

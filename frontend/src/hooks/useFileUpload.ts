import { useState } from 'react';

export interface UploadedFile {
    originalName: string;
    filename: string;
    path: string;
    size: number;
    mimetype: string;
}

export interface UploadResponse {
    success: boolean;
    message: string;
    data?: {
        idSesiune: string;
        folderPath: string;
        files: UploadedFile[];
    };
    error?: string;
}

const API_BASE_URL = 'http://localhost:5000/api';

export const useFileUpload = () => {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const uploadSignedDocuments = async (idSesiune: string, files: File[]): Promise<UploadResponse> => {
        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('idSesiune', idSesiune);
            
            // Adaugă toate fișierele
            files.forEach((file) => {
                formData.append('files', file);
            });

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/upload/signed-documents`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    // Nu seta Content-Type pentru FormData - browser-ul va seta automat cu boundary
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result: UploadResponse = await response.json();
            console.log(`✅ Upload completat pentru sesiunea ${idSesiune}:`, result);
            return result;

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Eroare la upload-ul fișierelor';
            setError(errorMessage);
            console.error('Eroare la upload:', err);
            return {
                success: false,
                message: 'Eroare la upload',
                error: errorMessage
            };
        } finally {
            setUploading(false);
        }
    };

    const deleteSessionFiles = async (idSesiune: string): Promise<boolean> => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/upload/signed-documents/${idSesiune}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                console.warn(`Eroare la ștergerea fișierelor pentru sesiunea ${idSesiune}`);
                return false;
            }

            const result = await response.json();
            console.log(`🗑️ Fișiere șterse pentru sesiunea ${idSesiune}:`, result.message);
            return true;

        } catch (err) {
            console.error(`Eroare la ștergerea fișierelor pentru sesiunea ${idSesiune}:`, err);
            return false;
        }
    };

    return {
        uploading,
        error,
        uploadSignedDocuments,
        deleteSessionFiles,
    };
};

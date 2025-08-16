import { useState, useEffect } from 'react';
import axios from 'axios';

// Tipuri pentru backend
interface BackupRecord {
  ID: number;
  BackupID: string;
  TipBackup: 'sql' | 'blob' | 'full';
  StatusBackup: 'in_progress' | 'completed' | 'failed' | 'partial';
  DataCreare: string;
  DataFinalizare?: string;
  DurataSecunde?: number;
  NumarBloburi?: number;
  DimensiuneBlobBytes?: number;
  DimensiuneSQLBytes?: number;
  NumarInregistrariSQL?: number;
  MesajSucces?: string;
  MesajEroare?: string;
  CreatDe?: string;
}

interface BackupStats {
  totalBackups: number;
  successfulBackups: number;
  failedBackups: number;
  lastBackup?: BackupRecord;
  totalSizeBytes: number;
  avgDurationSeconds: number;
}

// Note: Backend responses are handled inline; specific response interfaces removed to avoid unused types

export const useSetariBackup = () => {
  const [backupHistory, setBackupHistory] = useState<BackupRecord[]>([]);
  const [backupStats, setBackupStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = 'http://localhost:5000/api/backup';

  // Obține token-ul de autentificare din localStorage
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // Headers pentru requests
  const getHeaders = () => ({
    'Authorization': `Bearer ${getAuthToken()}`,
    'Content-Type': 'application/json'
  });

  // Încarcă istoricul backup-urilor
  const loadBackupHistory = async (_limit: number = 20, _offset: number = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(
        `${API_BASE}/list`,  // Folosim endpoint-ul /list pentru backup-uri locale
        { headers: getHeaders() }
      );
      
      if (response.data.success) {
        // Adaptare pentru ApiResponseHelper - datele sunt în response.data.data
        const backups = response.data.data || [];
        // Convertim backup-urile locale la formatul așteptat
        const formattedBackups = backups.map((backup: any) => ({
          ID: backup.id || backup.backupId,
          BackupID: backup.backupId || backup.id,
          TipBackup: 'full' as const,
          StatusBackup: 'completed' as const,
          DataCreare: backup.createdAt || new Date().toISOString(),
          DataFinalizare: backup.createdAt || new Date().toISOString(),
          DurataSecunde: 0,
          NumarBloburi: 0,
          DimensiuneBlobBytes: backup.totalSize || 0,
          DimensiuneSQLBytes: backup.sqlSize || 0,
          NumarInregistrariSQL: 0,
          MesajSucces: 'Backup local creat cu succes',
          CreatDe: 'Sistem'
        }));
        setBackupHistory(formattedBackups);
      } else {
        setError(response.data.message || 'Eroare la încărcarea istoricului');
        setBackupHistory([]);
      }
    } catch (err) {
      console.error('Eroare la încărcarea istoricului backup:', err);
      setError('Eroare la încărcarea datelor');
      setBackupHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // Încarcă statisticile backup-urilor
  const loadBackupStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(
        `${API_BASE}/stats`,
        { headers: getHeaders() }
      );
      
      if (response.data.success) {
        // Adaptare pentru ApiResponseHelper - datele sunt în response.data.data
        setBackupStats(response.data.data || null);
      } else {
        setError(response.data.message || 'Eroare la încărcarea statisticilor');
      }
    } catch (err) {
      console.error('Eroare la încărcarea statisticilor backup:', err);
      setError('Eroare la încărcarea statisticilor');
    } finally {
      setLoading(false);
    }
  };

  // Creează un backup nou
  const createBackup = async (type: 'sql' | 'blob' | 'full') => {
    try {
      setCreating(true);
      setError(null);
      
      const response = await axios.post(
        `${API_BASE}/create`,
        { 
          type: type,
          userId: 'utilizator_curent' 
        },
        { headers: getHeaders() }
      );
      
      if (response.data.success) {
        // Reîncarcă datele după crearea backup-ului
        await Promise.all([loadBackupHistory(), loadBackupStats()]);
        return response.data;
      } else {
        setError(response.data.message || 'Eroare la crearea backup-ului');
        return null;
      }
    } catch (err) {
      console.error('Eroare la crearea backup-ului:', err);
      setError('Eroare la crearea backup-ului');
      return null;
    } finally {
      setCreating(false);
    }
  };
  // Descarcă un backup
  const downloadBackup = async (backupId: string, _type?: 'sql' | 'blob' | 'full') => {
    try {
      const url = `${API_BASE}/download/${backupId}`;
        
      const response = await axios.get(url, { 
        headers: getHeaders(),
        responseType: 'blob'  // Pentru download de fișiere
      });
      
      // Creează un link pentru descărcare
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `backup-${backupId}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      return true;
    } catch (err) {
      console.error('Eroare la descărcarea backup-ului:', err);
      setError('Eroare la descărcare');
      return false;
    }
  };

  // Formatează dimensiunea în bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Formatează durata în secunde
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  // Formatează data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ro-RO');
  };

  // Încarcă datele la mount
  useEffect(() => {
    loadBackupHistory();
    loadBackupStats();
  }, []);

  return {
    backupHistory,
    backupStats,
    loading,
    creating,
    error,
    loadBackupHistory,
    loadBackupStats,
    createBackup,
    downloadBackup,
    formatBytes,
    formatDuration,
    formatDate,
    refreshData: () => Promise.all([loadBackupHistory(), loadBackupStats()])
  };
};

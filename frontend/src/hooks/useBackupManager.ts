import { useState } from "react";
import { toast } from "sonner";

export interface BackupSettings {
  automaticBackups: boolean;
  backupFrequency: string;
  retentionPeriod: number;
  lastBackupDate: string | null;
}

export interface BackupFile {
  id: string;
  date: string;
  type: "Automat" | "Manual";
  size: string;
}

export const useBackupManager = () => {
  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    automaticBackups: true,
    backupFrequency: "daily",
    retentionPeriod: 30,
    lastBackupDate: null
  });
  const [recentBackups, setRecentBackups] = useState<BackupFile[]>([
    { id: 'backup-1', date: "15.05.2025 12:30", type: "Automat", size: "4.2 MB" },
    { id: 'backup-2', date: "08.05.2025 12:30", type: "Automat", size: "4.1 MB" },
    { id: 'backup-3', date: "01.05.2025 12:30", type: "Manual", size: "4.0 MB" },
  ]);
  const [loading, setLoading] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);

  // Save backup settings
  const handleSaveBackupSettings = () => {
    // Aici va fi implementată logica de salvare a setărilor de backup
    toast.success("Setările de backup au fost actualizate!");
  };

  // Create a manual backup
  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      // Simulare backup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Adaugă noul backup în lista de backup-uri recente
      const newBackup: BackupFile = {
        id: `backup-${Date.now()}`,
        date: new Date().toLocaleString('ro-RO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).replace(',', ''),
        type: "Manual",
        size: "4.3 MB"
      };
      
      setRecentBackups(prev => [newBackup, ...prev]);
      toast.success("Backup creat cu succes!");
    } catch (error) {
      console.error('Eroare la crearea backup-ului:', error);
      toast.error("Eroare la crearea backup-ului");
    } finally {
      setCreatingBackup(false);
    }
  };

  // Download a backup
  const handleDownloadBackup = (backupId: string) => {
    // Implementare pentru descărcarea backup-ului
    toast.success(`Se descarcă backup-ul ${backupId}...`);
  };

  // Load backups and settings
  const loadBackupData = async () => {
    setLoading(true);
    try {
      // Implementare pentru încărcarea backup-urilor din API
      // De adăugat când va fi disponibil endpoint-ul
      setLoading(false);
    } catch (error) {
      console.error('Eroare la încărcarea datelor de backup:', error);
      toast.error("Eroare la încărcarea datelor de backup");
      setLoading(false);
    }
  };

  return {
    backupSettings,
    setBackupSettings,
    recentBackups,
    loading,
    creatingBackup,
    handleSaveBackupSettings,
    handleCreateBackup,
    handleDownloadBackup,
    loadBackupData
  };
};

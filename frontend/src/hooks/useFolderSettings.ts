import { useState, useEffect } from "react";
import { toast } from "sonner";

export interface FolderSettings {
  sabloanePath: string;
  cereriConfirmarePath: string;
  backupPath: string;
  cereriSemnatePath: string;
  logosPath: string;
}

// Default folder settings
export const defaultFolderSettings: FolderSettings = {
  sabloanePath: "C:\\BalanceBeaconBuddy\\Sabloane",
  cereriConfirmarePath: "C:\\BalanceBeaconBuddy\\CereriGenerate",
  backupPath: "C:\\BalanceBeaconBuddy\\Backup",
  cereriSemnatePath: "C:\\BalanceBeaconBuddy\\CereriSemnate",
  logosPath: "C:\\BalanceBeaconBuddy\\Logos"
};

export const useFolderSettings = () => {
  const [folderSettings, setFolderSettings] = useState<FolderSettings>(defaultFolderSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load folder settings from the server
  const loadFolderSettings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Nu ești autentificat. Te rog să te conectezi.");
      }

      const response = await fetch('/api/folder-settings', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFolderSettings(data.folderSettings || defaultFolderSettings);
        console.log("Setările de foldere au fost încărcate cu succes");
      } else if (response.status === 404) {
        // Nu există setări salvate, folosește valorile implicite
        setFolderSettings(defaultFolderSettings);
        console.log("Nu există setări de foldere, se folosesc valorile implicite");
      } else {
        throw new Error("Eroare la încărcarea setărilor de foldere");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Eroare la încărcarea setărilor de foldere';
      setError(errorMessage);
      console.error('Eroare la încărcarea setărilor de foldere:', err);
      
      // Folosește valorile implicite în caz de eroare
      setFolderSettings(defaultFolderSettings);
    } finally {
      setLoading(false);
    }
  };

  // Save folder settings to the server
  const saveFolderSettings = async () => {
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Nu ești autentificat. Te rog să te conectezi.");
      }

      const response = await fetch('/api/folder-settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ folderSettings })
      });

      if (response.ok) {
        toast.success("Setările de foldere au fost salvate cu succes!");
        console.log("Setările de foldere au fost salvate cu succes");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Eroare la salvarea setărilor');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Eroare la salvarea setărilor de foldere';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Eroare la salvarea setărilor de foldere:', err);
    } finally {
      setSaving(false);
    }
  };

  // Test if a folder is accessible
  const testFolder = async (path: string, folderType: string) => {
    if (!path) {
      toast.warning(`Te rog să specifici calea pentru ${folderType}`);
      return false;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Nu ești autentificat.");
      }

      const response = await fetch('/api/folder-settings/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path, folderType })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Folderul ${folderType} este accesibil!`);
        return true;
      } else {
        toast.error(`Folderul ${folderType} nu este accesibil: ${data.message}`);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Eroare la testarea folderului';
      toast.error(errorMessage);
      console.error('Eroare la testarea folderului:', err);
      return false;
    }
  };

  // Create folder if it doesn't exist
  const createFolder = async (path: string, folderType: string) => {
    if (!path) {
      toast.warning(`Te rog să specifici calea pentru ${folderType}`);
      return false;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Nu ești autentificat.");
      }

      const response = await fetch('/api/folder-settings/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path, folderType })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Folderul ${folderType} a fost creat cu succes!`);
        return true;
      } else {
        toast.error(`Nu s-a putut crea folderul ${folderType}: ${data.message}`);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Eroare la crearea folderului';
      toast.error(errorMessage);
      console.error('Eroare la crearea folderului:', err);
      return false;
    }
  };

  // Reset folder settings to default values
  const resetFolderSettings = () => {
    setFolderSettings(defaultFolderSettings);
    setError(null);
    toast.info("Setările de foldere au fost resetate la valorile implicite");
  };

  // Validate folder paths
  const validateFolderSettings = (): boolean => {
    const errors: string[] = [];

    if (!folderSettings.sabloanePath.trim()) {
      errors.push("Calea pentru șabloane este obligatorie");
    }
    
    if (!folderSettings.cereriConfirmarePath.trim()) {
      errors.push("Calea pentru cereri generate este obligatorie");
    }
    
    if (!folderSettings.backupPath.trim()) {
      errors.push("Calea pentru backup este obligatorie");
    }
    
    if (!folderSettings.cereriSemnatePath.trim()) {
      errors.push("Calea pentru cereri semnate este obligatorie");
    }

    if (!folderSettings.logosPath.trim()) {
      errors.push("Calea pentru logo-uri este obligatorie");
    }

    if (errors.length > 0) {
      setError(errors.join(", "));
      toast.error(errors[0]); // Afișează prima eroare
      return false;
    }

    setError(null);
    return true;
  };

  // Load folder settings on component mount
  useEffect(() => {
    loadFolderSettings();
  }, []);

  return {
    folderSettings,
    setFolderSettings,
    loading,
    saving,
    error,
    loadFolderSettings,
    saveFolderSettings,
    testFolder,
    createFolder,
    resetFolderSettings,
    validateFolderSettings
  };
};

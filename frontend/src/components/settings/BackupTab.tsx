import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
// Toast removed to eliminate warnings
import { ReloadIcon, DownloadIcon } from "@radix-ui/react-icons";

interface BackupItem {
  id: string;
  fileName: string;
  createdAt: string;
  type: 'MANUAL' | 'AUTOMATIC';
  size: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';
}

interface BackupSettings {
  autoBackupEnabled: boolean;
  cloudBackupEnabled: boolean;
  emailNotificationsEnabled: boolean;
  backupTime: string;
}

export const BackupTab = () => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [testingBackup, setTestingBackup] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState<string | null>(null);
  const [settings, setSettings] = useState<BackupSettings>({
    autoBackupEnabled: false,
    cloudBackupEnabled: false,
    emailNotificationsEnabled: false,
    backupTime: "12:30"
  });
  useEffect(() => {
    loadBackupSettings();
    loadBackups();
  }, []);

  const loadBackupSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("Nu ești autentificat. Te rog să te conectezi.");
        return;
      }

      const response = await fetch('/api/backup/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        console.log("Setările de backup nu au fost găsite, se folosesc valorile implicite");
      }
    } catch (error) {
      console.error('Eroare la încărcarea setărilor de backup:', error);
    }
  };

  const loadBackups = async () => {
    setLoadingBackups(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("Nu ești autentificat. Te rog să te conectezi.");
        return;
      }

      const response = await fetch('/api/backup/list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBackups(data);
      } else {
        console.error("Eroare la încărcarea backup-urilor");
      }
    } catch (error) {
      console.error('Eroare la încărcarea backup-urilor:', error);
      console.error("Eroare la conectarea cu serverul");
    } finally {
      setLoadingBackups(false);
    }
  };

  const saveBackupSettings = async (newSettings: Partial<BackupSettings>) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("Nu ești autentificat. Te rog să te conectezi.");
        return;
      }

      const updatedSettings = { ...settings, ...newSettings };
      const response = await fetch('/api/backup/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedSettings)
      });

      if (response.ok) {
        setSettings(updatedSettings);
        console.log("Setările de backup au fost salvate cu succes!");
      } else {
        const errorData = await response.json();
        console.error(`Eroare la salvarea setărilor: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Eroare la salvarea setărilor de backup:', error);
      console.error("Eroare la conectarea cu serverul");
    }
  };

  const createManualBackup = async () => {
    setCreatingBackup(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("Nu ești autentificat. Te rog să te conectezi.");
        return;
      }

      const response = await fetch('/api/backup/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: 'MANUAL' })
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Backup-ul manual a fost creat cu succes!");
        loadBackups(); // Reîncarcă lista de backup-uri
      } else {
        const errorData = await response.json();
        console.error(`Eroare la crearea backup-ului: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Eroare la crearea backup-ului:', error);
      console.error("Eroare la conectarea cu serverul");
    } finally {
      setCreatingBackup(false);
    }
  };

  const testBackup = async () => {
    setTestingBackup(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("Nu ești autentificat. Te rog să te conectezi.");
        return;
      }

      const response = await fetch('/api/backup/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log("Testul de backup a fost finalizat cu succes!");
        } else {
          console.error(`Eroare la testarea backup-ului: ${data.message}`);
        }
      } else {
        const errorData = await response.json();
        console.error(`Eroare la testarea backup-ului: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Eroare la testarea backup-ului:', error);
      console.error("Eroare la conectarea cu serverul");
    } finally {
      setTestingBackup(false);
    }
  };

  const downloadBackup = async (backupId: string, fileName: string) => {
    setDownloadingBackup(backupId);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("Nu ești autentificat. Te rog să te conectezi.");
        return;
      }

      const response = await fetch(`/api/backup/download/${backupId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log("Backup-ul a fost descărcat cu succes!");
      } else {
        const errorData = await response.json();
        console.error(`Eroare la descărcarea backup-ului: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Eroare la descărcarea backup-ului:', error);
      console.error("Eroare la conectarea cu serverul");
    } finally {
      setDownloadingBackup(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBackupTypeLabel = (type: string): string => {
    return type === 'MANUAL' ? 'Manual' : 'Automat';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600';
      case 'IN_PROGRESS': return 'text-blue-600';
      case 'FAILED': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup & Securitate</CardTitle>
        <CardDescription>
          Configurează backup-urile automate și setările de securitate
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-base">Backup automat zilnic</div>
              <div className="text-sm text-muted-foreground">
                Creează backup-uri automate în fiecare zi la ora {settings.backupTime}
              </div>
            </div>
            <Switch 
              checked={settings.autoBackupEnabled}
              onCheckedChange={(checked) => saveBackupSettings({ autoBackupEnabled: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-base">Backup în cloud</div>
              <div className="text-sm text-muted-foreground">
                Salvează backup-urile în Azure Blob Storage
              </div>
            </div>
            <Switch 
              checked={settings.cloudBackupEnabled}
              onCheckedChange={(checked) => saveBackupSettings({ cloudBackupEnabled: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-base">Notificări email</div>
              <div className="text-sm text-muted-foreground">
                Primește notificări email pentru backup-uri
              </div>
            </div>
            <Switch 
              checked={settings.emailNotificationsEnabled}
              onCheckedChange={(checked) => saveBackupSettings({ emailNotificationsEnabled: checked })}
            />
          </div>
        </div>
        
        <Separator />
          <div className="flex gap-2">
          <Button onClick={createManualBackup} disabled={creatingBackup}>
            {creatingBackup && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
            Creează backup manual
          </Button>
          <Button variant="outline" onClick={testBackup} disabled={testingBackup}>
            {testingBackup && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
            Testează backup
          </Button>
          <Button variant="outline" onClick={loadBackups} disabled={loadingBackups}>
            {loadingBackups && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
            Reîmprospătează
          </Button>
        </div>
        
        <Separator className="my-4" />
          <div className="space-y-2">
          <h3 className="text-sm font-medium">Backup-uri recente</h3>
          
          {loadingBackups ? (
            <div className="flex items-center justify-center p-8">
              <ReloadIcon className="h-6 w-6 animate-spin" />
              <span className="ml-2">Se încarcă backup-urile...</span>
            </div>
          ) : backups.length === 0 ? (
            <div className="border rounded-md p-6 text-center text-muted-foreground">
              Nu există backup-uri disponibile
            </div>
          ) : (
            <div className="border rounded-md divide-y">
              {backups.map((backup) => (
                <div key={backup.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-medium">{formatDate(backup.createdAt)}</p>
                    <p className="text-sm text-muted-foreground">
                      <span className={getStatusColor(backup.status)}>
                        {getBackupTypeLabel(backup.type)}
                      </span>
                      {backup.status === 'COMPLETED' && (
                        <> • {formatFileSize(backup.size)}</>
                      )}
                      {backup.status === 'IN_PROGRESS' && (
                        <> • <span className="text-blue-600">În progres...</span></>
                      )}
                      {backup.status === 'FAILED' && (
                        <> • <span className="text-red-600">Eșuat</span></>
                      )}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => downloadBackup(backup.id, backup.fileName)}
                    disabled={backup.status !== 'COMPLETED' || downloadingBackup === backup.id}
                  >
                    {downloadingBackup === backup.id ? (
                      <ReloadIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <DownloadIcon className="mr-2 h-4 w-4" />
                        Descarcă
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


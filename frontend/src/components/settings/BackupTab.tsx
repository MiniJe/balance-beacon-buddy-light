import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ReloadIcon, DownloadIcon, CheckCircledIcon, ExclamationTriangleIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { useToast } from "@/hooks/use-toast";

interface BackupItem {
  id: string;
  fileName: string;
  createdAt: string;
  type: 'MANUAL' | 'AUTOMATIC';
  size: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';
  path?: string;
}

interface BackupSettings {
  autoBackupEnabled: boolean;
  cloudBackupEnabled: boolean;
  emailNotificationsEnabled: boolean;
  backupTime: string;
}

export const BackupTab = () => {
  const { toast } = useToast();
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [testingBackup, setTestingBackup] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState<string | null>(null);
  const [settings, setSettings] = useState<BackupSettings>({
    autoBackupEnabled: false,
    cloudBackupEnabled: false,
    emailNotificationsEnabled: false,
    backupTime: "02:00"
  });

  useEffect(() => {
    loadBackupSettings();
    loadBackups();
  }, []);

  const loadBackupSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Eroare autentificare",
          description: "Nu ești autentificat. Te rog să te conectezi.",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch('/api/backup/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSettings(result.data);
        }
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
        toast({
          title: "Eroare autentificare",
          description: "Nu ești autentificat. Te rog să te conectezi.",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch('/api/backup/list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setBackups(result.data || []);
        }
      } else {
        toast({
          title: "Eroare",
          description: "Eroare la încărcarea backup-urilor",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Eroare la încărcarea backup-urilor:', error);
      toast({
        title: "Eroare conectare",
        description: "Eroare la conectarea cu serverul",
        variant: "destructive"
      });
    } finally {
      setLoadingBackups(false);
    }
  };

  const saveBackupSettings = async (newSettings: Partial<BackupSettings>) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Eroare autentificare",
          description: "Nu ești autentificat. Te rog să te conectezi.",
          variant: "destructive"
        });
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
        const result = await response.json();
        if (result.success) {
          setSettings(updatedSettings);
          toast({
            title: "Succes",
            description: "Setările de backup au fost salvate cu succes!",
            variant: "default"
          });
        }
      } else {
        const errorData = await response.json();
        toast({
          title: "Eroare",
          description: `Eroare la salvarea setărilor: ${errorData.message}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Eroare la salvarea setărilor de backup:', error);
      toast({
        title: "Eroare conectare",
        description: "Eroare la conectarea cu serverul",
        variant: "destructive"
      });
    }
  };

  const createManualBackup = async () => {
    setCreatingBackup(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Eroare autentificare",
          description: "Nu ești autentificat. Te rog să te conectezi.",
          variant: "destructive"
        });
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
        const result = await response.json();
        if (result.success) {
          toast({
            title: "Succes",
            description: "Backup-ul manual a fost creat cu succes!",
            variant: "default"
          });
          loadBackups(); // Reîncarcă lista de backup-uri
        }
      } else {
        const errorData = await response.json();
        toast({
          title: "Eroare",
          description: `Eroare la crearea backup-ului: ${errorData.message}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Eroare la crearea backup-ului:', error);
      toast({
        title: "Eroare conectare",
        description: "Eroare la conectarea cu serverul",
        variant: "destructive"
      });
    } finally {
      setCreatingBackup(false);
    }
  };

  const testBackup = async () => {
    setTestingBackup(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Eroare autentificare",
          description: "Nu ești autentificat. Te rog să te conectezi.",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch('/api/backup/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast({
            title: "Test reușit",
            description: "Testul de backup a fost finalizat cu succes!",
            variant: "default"
          });
          
          // Afișează detalii despre teste
          if (result.tests) {
            console.log("Rezultate teste backup:", result.tests);
          }
        } else {
          toast({
            title: "Test parțial",
            description: result.message || "Unele teste au eșuat",
            variant: "destructive"
          });
        }
      } else {
        const errorData = await response.json();
        toast({
          title: "Eroare",
          description: `Eroare la testarea backup-ului: ${errorData.message}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Eroare la testarea backup-ului:', error);
      toast({
        title: "Eroare conectare",
        description: "Eroare la conectarea cu serverul",
        variant: "destructive"
      });
    } finally {
      setTestingBackup(false);
    }
  };

  const downloadBackup = async (backupId: string, fileName: string) => {
    setDownloadingBackup(backupId);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Eroare autentificare",
          description: "Nu ești autentificat. Te rog să te conectezi.",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(`/api/backup/download/${backupId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast({
            title: "Backup disponibil",
            description: result.data.message || "Backup-ul este disponibil pentru descărcare",
            variant: "default"
          });
          
          // Pentru backup-urile locale, informează utilizatorul despre locația fișierului
          if (result.data.downloadPath) {
            console.log("Path backup local:", result.data.downloadPath);
          }
        }
      } else {
        const errorData = await response.json();
        toast({
          title: "Eroare",
          description: `Eroare la descărcarea backup-ului: ${errorData.message}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Eroare la descărcarea backup-ului:', error);
      toast({
        title: "Eroare conectare",
        description: "Eroare la conectarea cu serverul",
        variant: "destructive"
      });
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircledIcon className="h-4 w-4 text-green-600" />;
      case 'IN_PROGRESS': return <ReloadIcon className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'FAILED': return <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />;
      default: return <InfoCircledIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup & Securitate</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
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
                Backup-uri în cloud momentan nu sunt disponibile în versiunea Light
              </div>
            </div>
            <Switch 
              checked={false}
              disabled={true}
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
              <InfoCircledIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nu există backup-uri disponibile</p>
              <p className="text-xs mt-1">Creează primul backup folosind butonul de mai sus</p>
            </div>
          ) : (
            <div className="border rounded-md divide-y">
              {backups.map((backup) => (
                <div key={backup.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(backup.status)}
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
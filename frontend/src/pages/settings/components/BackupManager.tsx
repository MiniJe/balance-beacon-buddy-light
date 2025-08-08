import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Clock, Download, RefreshCw, Database, FolderOpen, HardDrive } from "lucide-react";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useBackupManager } from "@/hooks/useBackupManager";
import { useSetariBackup } from "@/hooks/useSetariBackup";

const BackupManager = () => {
  const {
    backupSettings,
    setBackupSettings,
    recentBackups,
    loading: oldLoading,
    creatingBackup: oldCreatingBackup,
    handleSaveBackupSettings,
    handleCreateBackup: oldHandleCreateBackup,
    handleDownloadBackup: oldHandleDownloadBackup
  } = useBackupManager();

  const {
    backupHistory,
    backupStats,
    loading,
    creating,
    error,
    createBackup,
    downloadBackup,
    formatBytes,
    formatDuration,
    formatDate,
    refreshData
  } = useSetariBackup();

  const handleCreateBackup = async (type: 'sql' | 'blob' | 'full') => {
    const result = await createBackup(type);
    if (result) {
      console.log('Backup creat cu succes:', result);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Completat</Badge>;
      case 'in_progress':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />În progres</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Eșuat</Badge>;
      case 'partial':
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Parțial</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sql':
        return <Database className="w-4 h-4" />;
      case 'blob':
        return <FolderOpen className="w-4 h-4" />;
      case 'full':
        return <HardDrive className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestionare Backup</CardTitle>
        <CardDescription>
          {loading ? "Se încarcă..." : "Configurează backup-urile automate și gestionează backup-urile existente"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="automatic-backups">Backup-uri automate</Label>
              <p className="text-sm text-muted-foreground">
                Crează backup-uri automate la intervale regulate
              </p>
            </div>
            <Switch 
              id="automatic-backups"
              checked={backupSettings.automaticBackups}
              onCheckedChange={(checked) => 
                setBackupSettings({
                  ...backupSettings,
                  automaticBackups: checked
                })
              }
            />
          </div>
          
          {backupSettings.automaticBackups && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="backup-frequency">Frecvență backup</Label>
                <Select 
                  value={backupSettings.backupFrequency}
                  onValueChange={(value) => 
                    setBackupSettings({
                      ...backupSettings,
                      backupFrequency: value
                    })
                  }
                >
                  <SelectTrigger id="backup-frequency">
                    <SelectValue placeholder="Selectează frecvența" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Zilnic</SelectItem>
                    <SelectItem value="weekly">Săptămânal</SelectItem>
                    <SelectItem value="monthly">Lunar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="retention-period">Perioadă de păstrare (zile)</Label>
                <Input 
                  id="retention-period" 
                  type="number" 
                  min="1"
                  value={backupSettings.retentionPeriod}
                  onChange={(e) => 
                    setBackupSettings({
                      ...backupSettings,
                      retentionPeriod: parseInt(e.target.value)
                    })
                  }
                />
              </div>
            </div>
          )}
            <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSaveBackupSettings}
              className="flex-1"
            >
              Salvează Setările
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => handleCreateBackup('full')}
              disabled={creating}
              className="flex-1"
            >
              {creating ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  Se creează...
                </>
              ) : (
                "Creează Backup Complet"
              )}
            </Button>
          </div>

          {/* Statistici Backup */}
          {backupStats && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="p-3 border rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{backupStats.totalBackups}</div>
                <div className="text-sm text-muted-foreground">Total backup-uri</div>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{backupStats.successfulBackups}</div>
                <div className="text-sm text-muted-foreground">Completate</div>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-600">{formatBytes(backupStats.totalSizeBytes)}</div>
                <div className="text-sm text-muted-foreground">Dimensiune totală</div>
              </div>
            </div>
          )}

          {/* Butoane pentru tipuri de backup */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => handleCreateBackup('sql')}
              disabled={creating}
              className="flex flex-col items-center gap-1 h-16"
            >
              <Database className="w-5 h-5" />
              <span className="text-xs">Backup SQL</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleCreateBackup('blob')}
              disabled={creating}
              className="flex flex-col items-center gap-1 h-16"
            >
              <FolderOpen className="w-5 h-5" />
              <span className="text-xs">Backup Fișiere</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleCreateBackup('full')}
              disabled={creating}
              className="flex flex-col items-center gap-1 h-16"
            >
              <HardDrive className="w-5 h-5" />
              <span className="text-xs">Backup Complet</span>
            </Button>
          </div>
          
          <Separator className="my-4" />

          {/* Header pentru istoric */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Istoric backup-uri</h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={refreshData}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Mesaj de eroare */}
          {error && (
            <div className="p-3 border border-red-200 rounded-lg bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}
          
          {/* Lista backup-uri */}
          <div className="border rounded-md divide-y max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                <ReloadIcon className="w-4 h-4 animate-spin mx-auto mb-2" />
                Se încarcă backup-urile...
              </div>
            ) : backupHistory.length === 0 ? (
              <p className="p-4 text-center text-muted-foreground">Nu există backup-uri disponibile</p>
            ) : (
              backupHistory.map((backup) => (
                <div key={backup.BackupID} className="flex items-center justify-between p-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(backup.TipBackup)}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{backup.BackupID}</p>
                        {getStatusBadge(backup.StatusBackup)}
                      </div>
                      <div className="text-xs text-muted-foreground space-x-2">
                        <span>{formatDate(backup.DataCreare)}</span>
                        {backup.DurataSecunde && <span>• {formatDuration(backup.DurataSecunde)}</span>}
                        {(backup.DimensiuneBlobBytes || backup.DimensiuneSQLBytes) && (
                          <span>• {formatBytes((backup.DimensiuneBlobBytes || 0) + (backup.DimensiuneSQLBytes || 0))}</span>
                        )}
                      </div>
                      {backup.MesajEroare && (
                        <p className="text-xs text-red-600 mt-1">{backup.MesajEroare}</p>
                      )}
                    </div>
                  </div>
                  {backup.StatusBackup === 'completed' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => downloadBackup(backup.BackupID, backup.TipBackup)}
                      disabled={loading}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Descarcă
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BackupManager;

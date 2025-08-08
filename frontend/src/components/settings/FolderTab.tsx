import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, FolderPlus, RefreshCw, Settings, FileText, Archive, PenTool, Image } from "lucide-react";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useFolderSettings, type FolderSettings } from "@/hooks/useFolderSettings";

export const FolderTab = () => {
  const {
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
  } = useFolderSettings();

  const selectFolder = async (settingKey: keyof FolderSettings) => {
    try {
      // Folosește Electron API pentru selectarea folderului (dacă este disponibil)
      // Altfel, utilizatorul va trebui să introducă manual calea
      const path = prompt("Introduceți calea către folder:");
      if (path) {
        setFolderSettings({
          ...folderSettings,
          [settingKey]: path
        });
      }
    } catch (error) {
      console.error('Eroare la selectarea folderului:', error);
    }
  };

  const handleSaveFolderSettings = async () => {
    if (validateFolderSettings()) {
      await saveFolderSettings();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <ReloadIcon className="w-6 h-6 animate-spin mr-2" />
        <span>Se încarcă setările de foldere...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FolderOpen className="w-5 h-5 mr-2" />
          Configurare Foldere
        </CardTitle>
        <CardDescription>
          Configurează locațiile pentru salvarea diferitelor tipuri de fișiere generate de aplicație
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Afișează erori de validare */}
        {error && (
          <div className="p-3 border border-red-200 rounded-lg bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Folder pentru Șabloane */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <Label className="text-base font-medium">Folder Șabloane</Label>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => selectFolder('sabloanePath')}
            >
              <FolderPlus className="w-4 h-4 mr-1" />
              Selectează
            </Button>
          </div>
          <div className="space-y-2">
            <Input 
              value={folderSettings.sabloanePath}
              onChange={(e) => setFolderSettings({...folderSettings, sabloanePath: e.target.value})}
              placeholder="C:\BalanceBeaconBuddy\Sabloane"
              className="font-mono text-sm"
            />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => testFolder(folderSettings.sabloanePath, 'Șabloane')}
              className="text-xs"
            >
              <Settings className="w-3 h-3 mr-1" />
              Testează Accesul
            </Button>
          </div>
        </div>

        <Separator />

        {/* Folder pentru Cereri Generate */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-green-600" />
              <Label className="text-base font-medium">Folder Cereri Generate</Label>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => selectFolder('cereriConfirmarePath')}
            >
              <FolderPlus className="w-4 h-4 mr-1" />
              Selectează
            </Button>
          </div>
          <div className="space-y-2">
            <Input 
              value={folderSettings.cereriConfirmarePath}
              onChange={(e) => setFolderSettings({...folderSettings, cereriConfirmarePath: e.target.value})}
              placeholder="C:\BalanceBeaconBuddy\CereriGenerate"
              className="font-mono text-sm"
            />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => testFolder(folderSettings.cereriConfirmarePath, 'Cereri Generate')}
              className="text-xs"
            >
              <Settings className="w-3 h-3 mr-1" />
              Testează Accesul
            </Button>
          </div>
        </div>

        <Separator />

        {/* Folder pentru Backup */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Archive className="w-4 h-4 text-purple-600" />
              <Label className="text-base font-medium">Folder Backup</Label>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => selectFolder('backupPath')}
            >
              <FolderPlus className="w-4 h-4 mr-1" />
              Selectează
            </Button>
          </div>
          <div className="space-y-2">
            <Input 
              value={folderSettings.backupPath}
              onChange={(e) => setFolderSettings({...folderSettings, backupPath: e.target.value})}
              placeholder="C:\BalanceBeaconBuddy\Backup"
              className="font-mono text-sm"
            />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => testFolder(folderSettings.backupPath, 'Backup')}
              className="text-xs"
            >
              <Settings className="w-3 h-3 mr-1" />
              Testează Accesul
            </Button>
          </div>
        </div>

        <Separator />

        {/* Folder pentru Cereri Semnate */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PenTool className="w-4 h-4 text-orange-600" />
              <Label className="text-base font-medium">Folder Cereri Semnate</Label>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => selectFolder('cereriSemnatePath')}
            >
              <FolderPlus className="w-4 h-4 mr-1" />
              Selectează
            </Button>
          </div>
          <div className="space-y-2">
            <Input 
              value={folderSettings.cereriSemnatePath}
              onChange={(e) => setFolderSettings({...folderSettings, cereriSemnatePath: e.target.value})}
              placeholder="C:\BalanceBeaconBuddy\CereriSemnate"
              className="font-mono text-sm"
            />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => testFolder(folderSettings.cereriSemnatePath, 'Cereri Semnate')}
              className="text-xs"
            >
              <Settings className="w-3 h-3 mr-1" />
              Testează Accesul
            </Button>
          </div>
        </div>

        <Separator />

        {/* Folder pentru Logo-uri */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Image className="w-4 h-4 text-indigo-600" />
              <Label className="text-base font-medium">Folder Logo-uri Companii</Label>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => selectFolder('logosPath')}
            >
              <FolderPlus className="w-4 h-4 mr-1" />
              Selectează
            </Button>
          </div>
          <div className="space-y-2">
            <Input 
              value={folderSettings.logosPath}
              onChange={(e) => setFolderSettings({...folderSettings, logosPath: e.target.value})}
              placeholder="C:\BalanceBeaconBuddy\Logos"
              className="font-mono text-sm"
            />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => testFolder(folderSettings.logosPath, 'Logo-uri')}
              className="text-xs"
            >
              <Settings className="w-3 h-3 mr-1" />
              Testează Accesul
            </Button>
          </div>
          <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
            <strong>Info:</strong> Logo-urile companiilor vor fi salvate în acest folder. 
            Fiecare companie va avea propriul subfolder bazat pe CUI.
          </div>
        </div>

        <Separator />

        {/* Acțiuni */}
        <div className="flex justify-between items-center pt-4">
          <div className="text-sm text-muted-foreground">
            <span className="flex items-center">
              <RefreshCw className="w-3 h-3 mr-1" />
              Ultima actualizare: {new Date().toLocaleDateString('ro-RO')}
            </span>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={resetFolderSettings}
              disabled={saving}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Resetează
            </Button>
            <Button 
              variant="outline" 
              onClick={loadFolderSettings}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Reîncarcă
            </Button>
            <Button 
              onClick={handleSaveFolderSettings}
              disabled={saving}
            >
              {saving ? (
                <>
                  <ReloadIcon className="w-4 h-4 mr-1 animate-spin" />
                  Se salvează...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4 mr-1" />
                  Salvează Setările
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

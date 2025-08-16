import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { ContabiliTab } from "@/components/settings/ContabiliTab";
import { EmailTab } from "@/components/settings/EmailTab";
import { CompanyTab } from "@/components/settings/CompanyTab";
import { BackupTab } from "@/components/settings/BackupTab";
import { FolderTab } from "@/components/settings/FolderTab";
import { AdvancedSettingsTab } from "@/components/settings/AdvancedSettingsTab";
import { UpdateTab } from "@/components/settings/UpdateTab";
import { useUpdateNotification } from "@/hooks/useUpdateNotification";

const Settings = () => {
  const { isMaster } = useAuth();
  const updateInfo = useUpdateNotification();

  return (
    <div className="container max-w-6xl mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Setări</h1>
          <p className="text-muted-foreground">
            Configurează aplicația și gestionează setările sistemului
          </p>
        </div>
        
        <Tabs defaultValue="email" className="space-y-4">
          <TabsList className={`grid w-full ${isMaster() ? 'grid-cols-7' : 'grid-cols-5'}`}>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="company">Companie</TabsTrigger>
            <TabsTrigger value="folders">Foldere</TabsTrigger>
            <TabsTrigger value="advanced">Setări Avansate</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
            {isMaster() && (
              <TabsTrigger value="contabili">Contabili</TabsTrigger>
            )}
            {isMaster() && (
              <TabsTrigger value="update" className="relative">Update
                {updateInfo.available && (
                  <span className="ml-1 inline-flex h-5 items-center rounded-full bg-red-500 px-2 text-[10px] font-semibold text-white">NEW</span>
                )}
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="email" className="space-y-4 mt-6">
            <EmailTab />
          </TabsContent>
          
          <TabsContent value="company" className="space-y-4 mt-6">
            <CompanyTab />
          </TabsContent>
          
          <TabsContent value="folders" className="space-y-4 mt-6">
            <FolderTab />
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4 mt-6">
            <AdvancedSettingsTab />
          </TabsContent>
          
          <TabsContent value="backup" className="space-y-4 mt-6">
            <BackupTab />
          </TabsContent>
          
          {isMaster() && (
            <TabsContent value="contabili" className="space-y-4 mt-6">
              <ContabiliTab />
            </TabsContent>
          )}
          {isMaster() && (
            <TabsContent value="update" className="space-y-4 mt-6">
              <UpdateTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
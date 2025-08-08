import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { ContabiliTab } from "@/components/settings/ContabiliTab";
import { EmailTab } from "@/components/settings/EmailTab";
import { CompanyTab } from "@/components/settings/CompanyTab";
import { BackupTab } from "@/components/settings/BackupTab";

const Settings = () => {
  const { user, isMaster } = useAuth();

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="company">Companie</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
            {isMaster() && (
              <TabsTrigger value="contabili">Contabili</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="email" className="space-y-4 mt-6">
            <EmailTab />
          </TabsContent>
          
          <TabsContent value="company" className="space-y-4 mt-6">
            <CompanyTab />
          </TabsContent>
          
          <TabsContent value="backup" className="space-y-4 mt-6">
            <BackupTab />
          </TabsContent>
          
          {isMaster() && (
            <TabsContent value="contabili" className="space-y-4 mt-6">
              <ContabiliTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
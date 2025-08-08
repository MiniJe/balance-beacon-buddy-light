import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import EmailSettings from "./components/EmailSettings";
import CompanySettings from "./components/CompanySettings";
import NotificationsSettings from "./components/NotificationsSettings";
import BackupManager from "./components/BackupManager";
import { ContabiliTab } from "@/components/settings/ContabiliTab";

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("email");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Setări</h1>
      </div>

      <Tabs 
        defaultValue="email" 
        value={activeTab} 
        onValueChange={setActiveTab}
      >
        <TabsList>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="company">Companie</TabsTrigger>
          <TabsTrigger value="notifications">Notificări</TabsTrigger>
          <TabsTrigger value="backups">Backup</TabsTrigger>
          {user?.TipUtilizator === 'MASTER' && <TabsTrigger value="contabili">Contabili</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="email" className="space-y-4 mt-6">
          <EmailSettings />
        </TabsContent>
        
        <TabsContent value="company" className="space-y-4 mt-6">
          <CompanySettings />
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-4 mt-6">
          <NotificationsSettings />
        </TabsContent>
        
        <TabsContent value="backups" className="space-y-4 mt-6">
          <BackupManager />
        </TabsContent>
        
        {user?.TipUtilizator === 'MASTER' && (
          <TabsContent value="contabili" className="space-y-4 mt-6">
            <ContabiliTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Settings;

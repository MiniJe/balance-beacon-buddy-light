import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionCard } from "@/components/dashboard/ActionCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Users, Activity, GitCommit, HardDrive } from "lucide-react";
import { PartnerStats } from "@/components/dashboard/PartnerStats"; 
import { useEffect, useState } from "react";
import { partenerService } from "@/services/partener.service";

const Dashboard = () => {
  const [statsData, setStatsData] = useState({
    totalPartners: 0,
    respondedPartners: 0,
    pendingPartners: 0,
    lastRequestDate: "N/A",
  });
  
  const [mini, setMini] = useState<{
    version?: string;
    healthOk?: boolean;
    lastBackupAt?: string | null;
    loading: boolean;
  }>({ loading: false });

  useEffect(() => {
    let interval: any;
    const fetchMini = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/system/overview', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const json = await res.json().catch(() => ({ success: false }));
        const version = json?.data?.version?.backendVersion || undefined;
        const healthOk = !!json?.data?.health?.ok;
        const lastBackupAt = json?.data?.lastBackupAt || null;
        setMini({ version, healthOk, lastBackupAt, loading: false });
      } catch {
        setMini({ version: undefined, healthOk: false, lastBackupAt: null, loading: false });
      }
    };

  const fetchDashboardData = async () => {
      try {
        // Obține date statistice
        const stats = await partenerService.getDashboardStats();
        setStatsData(stats);
        setMini(m => ({ ...m, loading: true }));
        await fetchMini();
        
  // TODO: Integrare viitoare: timeline activitate, ultimele erori, update status, health.
  // Istoricul va fi adăugat ulterior (placeholder eliminat)
      } catch (error) {
        console.error("Eroare la încărcarea datelor pentru dashboard:", error);
      } finally {
        // no local loading flag used
      }
    };

    fetchDashboardData();
    interval = setInterval(fetchMini, 30000);
    return () => { if (interval) clearInterval(interval); };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      {/* Mini indicatori (poate fi mutat în App Bar ulterior) */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded border px-2 py-1 bg-muted/40">
          <GitCommit className="h-3.5 w-3.5" />
          <span>Versiune</span>
          <span className="font-mono">{mini.version || '—'}</span>
        </span>
        <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 ${mini.healthOk ? 'bg-emerald-500/10 border-emerald-400/40 text-emerald-700' : 'bg-red-500/10 border-red-400/40 text-red-700'}`}>
          <Activity className={`h-3.5 w-3.5 ${mini.healthOk ? 'text-emerald-600' : 'text-red-600'}`} />
          <span>Health</span>
          <span className="font-semibold">{mini.healthOk ? 'OK' : 'FAIL'}</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded border px-2 py-1 bg-muted/40">
          <HardDrive className="h-3.5 w-3.5" />
          <span>Ultimul backup</span>
          <span className="font-mono">{mini.lastBackupAt ? formatRelative(mini.lastBackupAt) : '—'}</span>
        </span>
      </div>

      <PartnerStats key="partner-stats" data={statsData} />
      
      <Tabs defaultValue="overview" className="mt-8">
        <TabsList>
          <TabsTrigger value="overview">Privire Generală</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">          <div className="grid gap-4 grid-cols-1 md:grid-cols-4 mt-6">
            <ActionCard 
              key="send-requests"
              title={<>CERERI<br/>CONFIRMARE SOLD</>}
              description="Configurează și trimite cereri de confirmare sold către parteneri."
              actionLabel="TRIMITE CERERI"
              actionHref="/cereri"
              icon={<Mail className="h-8 w-8" />}
              variant="prominent"
            />
            
            <ActionCard 
              key="send-sold-requests"
              title={<>SOLICITARE<br/>FIȘE PARTENERI</>}
              description="Configurează și trimite solicitări de fișe partener către parteneri."
              actionLabel="TRIMITE CERERI"
              actionHref="/sold"
              icon={<Mail className="h-8 w-8" />}
              variant="prominent"
            />

            <ActionCard 
              key="manage-partners"
              title={<>GESTIONEAZĂ<br/>PARTENERII</>}
              description="Adaugă noi parteneri în sistem sau actualizează informațiile existente."
              actionLabel="EDITEAZĂ PARTENERII"
              actionHref="/parteneri"
              icon={<Users className="h-8 w-8" />}
              variant="prominent"
            />
            
            <ActionCard 
              key="edit-templates"
              title={<>ȘABLOANE<br/>EMAIL</>}
              description="Modifică șabloanele utilizate pentru cererile de confirmare sold."
              actionLabel="EDITEAZĂ ȘABLOANE"
              actionHref="/sabloane"
              icon={<Mail className="h-8 w-8" />}
              variant="prominent"
            />
          </div>
          
          {/* Secțiune rezervată pentru redesign viitor al dashboard-ului */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Stare Sistem</CardTitle>
                <CardDescription>Health, update & backup (în curând)</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Va afișa: ultimul health check, versiune curentă, ultimul backup.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Activitate Recentă</CardTitle>
                <CardDescription>Ultimele acțiuni utilizator / sistem</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Va lista evenimente (ex: update aplicat, cereri trimise).</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Sarcini</CardTitle>
                <CardDescription>Checklist operațional</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-xs list-disc pl-4 space-y-1 text-muted-foreground">
                  <li>Finalizează configurarea șabloanelor</li>
                  <li>Planifică cereri confirmare</li>
                  <li>Verifică backup local</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Optimizare</CardTitle>
                <CardDescription>Insight-uri automate</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Sugestii despre parteneri inactivi sau lipsă date.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;

// Helpers
function formatRelative(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`; 
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  return `${days}d`;
}

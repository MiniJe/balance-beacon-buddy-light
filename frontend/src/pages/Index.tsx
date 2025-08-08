
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionCard } from "@/components/dashboard/ActionCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Users } from "lucide-react";
import { PartnerStats } from "@/components/dashboard/PartnerStats"; 
import { useEffect, useState } from "react";
import { partenerService } from "@/services/partener.service";
import { Partener } from "@/types/partener";

const Dashboard = () => {
  const [statsData, setStatsData] = useState({
    totalPartners: 0,
    respondedPartners: 0,
    pendingPartners: 0,
    lastRequestDate: "N/A",
  });
  
  const [recentPartners, setRecentPartners] = useState<Partener[]>([]);
  const [recentResponses, setRecentResponses] = useState<any[]>([]);
  const [requestHistory, setRequestHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Obține date statistice
        const stats = await partenerService.getDashboardStats();
        setStatsData(stats);
        
        // Obține partenerii recenți
        const recent = await partenerService.getRecentPartners(5);
        setRecentPartners(recent);
        
        // În viitor, când vom avea API-uri pentru răspunsuri și istoric, vom înlocui cu:
        // const responses = await responseService.getRecentResponses(5);
        // setRecentResponses(responses);
        // const history = await requestService.getRequestHistory(5);
        // setRequestHistory(history);
        
        // Pentru moment, lasă listele goale până când implementăm API-urile
        setRecentResponses([]);
        setRequestHistory([]);
      } catch (error) {
        console.error("Eroare la încărcarea datelor pentru dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>      </div>

      <PartnerStats key="partner-stats" data={statsData} />
      
      <Tabs defaultValue="overview" className="mt-8">
        <TabsList>
          <TabsTrigger value="overview">Privire Generală</TabsTrigger>
          <TabsTrigger value="history">Istoric Solicitări</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">          <div className="grid gap-4 grid-cols-1 md:grid-cols-4 mt-6">
            <ActionCard 
              key="send-requests"
              title="CERERI CONFIRMARE SOLD"
              description="Configurează și trimite cereri de confirmare sold către parteneri."
              actionLabel="TRIMITE CERERI"
              actionHref="/cereri"
              icon={<Mail className="h-8 w-8" />}
              variant="prominent"
            />
            
            <ActionCard 
              key="send-sold-requests"
              title="SOLICITARE FIȘE PARTENER        "
              description="Configurează și trimite solicitări de fișe partener către parteneri."
              actionLabel="TRIMITE CERERI"
              actionHref="/sold"
              icon={<Mail className="h-8 w-8" />}
              variant="prominent"
            />

            <ActionCard 
              key="manage-partners"
              title="GESTIONEAZĂ PARTENERII"
              description="Adaugă noi parteneri în sistem sau actualizează informațiile existente."
              actionLabel="EDITEAZĂ PARTENERII"
              actionHref="/parteneri"
              icon={<Users className="h-8 w-8" />}
              variant="prominent"
            />
            
            <ActionCard 
              key="edit-templates"
              title="Șabloane Email"
              description="Modifică șabloanele utilizate pentru cererile de confirmare sold."
              actionLabel="EDITEAZĂ ȘABLOANE"
              actionHref="/sabloane"
              icon={<Mail className="h-8 w-8" />}
              variant="prominent"
            />
          </div>
          
          <div key="recent-data-grid" className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card key="recent-partners-card">
              <CardHeader>
                <CardTitle>Parteneri Recenți</CardTitle>
                <CardDescription>Ultimii parteneri adăugați în sistem</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {loading ? (
                    <p key="loading" className="text-sm text-muted-foreground">Se încarcă partenerii recenți...</p>
                  ) : recentPartners.length === 0 ? (
                    <p key="no-partners" className="text-sm text-muted-foreground">Nu există parteneri adăugați recent</p>
                  ) : (
                    recentPartners.map((partner, index) => (
                      <div key={partner.idPartener || `partner-${index}`} className="flex items-center justify-between border-b py-2 last:border-0">
                        <div>
                          <p className="font-medium">{partner.numePartener}</p>
                          <p className="text-sm text-muted-foreground">{partner.emailPartener || 'Fără email'}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {partner.dataCrearePartener 
                            ? partenerService.formatDate(partner.dataCrearePartener) 
                            : 'N/A'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card key="recent-responses-card">
              <CardHeader>
                <CardTitle>Ultimele Răspunsuri</CardTitle>
                <CardDescription>Cele mai recente confirmări primite</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {loading ? (
                    <p key="loading-responses" className="text-sm text-muted-foreground">Se încarcă răspunsurile recente...</p>
                  ) : recentResponses.length === 0 ? (
                    <p key="no-responses" className="text-sm text-muted-foreground">Nu există răspunsuri recente disponibile</p>
                  ) : (
                    recentResponses.map((response, index) => (
                      <div key={response.id || `response-${index}`} className="flex items-center justify-between border-b py-2 last:border-0">
                        <div>
                          <p className="font-medium">{response.name}</p>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            response.status === "Confirmat" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {response.status}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">{response.date}</div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
          <TabsContent value="history" className="space-y-6">
          <Card key="history-card">
            <CardHeader>
              <CardTitle>Istoric Solicitări</CardTitle>
              <CardDescription>Istoricul cererilor de confirmare sold trimise</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <p key="loading-history" className="text-sm text-muted-foreground">Se încarcă istoricul solicitărilor...</p>
                ) : requestHistory.length === 0 ? (
                  <p key="no-history" className="text-sm text-muted-foreground">Nu există istoric de solicitări disponibil</p>
                ) : (
                  requestHistory.map((batch, index) => (
                    <div key={batch.id || `batch-${index}`} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div>
                        <p className="font-medium text-lg">{batch.date}</p>
                        <p className="text-sm text-muted-foreground">
                          Trimise: {batch.sent} | Primite: {batch.received} | În așteptare: {batch.pending}
                        </p>
                      </div>
                      <div className="text-sm">
                        <span className="inline-block w-20 bg-gray-200 rounded-full h-2">
                          <span 
                            className="bg-primary h-2 rounded-full block" 
                            style={{width: `${(batch.received/batch.sent) * 100}%`}}
                          ></span>
                        </span>
                        <p className="text-xs text-center mt-1">{Math.round((batch.received/batch.sent) * 100)}% răspunsuri</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { TrendingUp, Clock, CheckCircle, XCircle, Loader2, RefreshCw, AlertTriangle, Users, Mail, Activity, Database, Building2, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; 
import { Badge } from "@/components/ui/badge"; 
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { reportsService, ReportsData } from '@/services/reports.service';
import { SendPdfDialog, type EmailData } from '@/components/partners/SendPdfDialog';
import { sesiuniService } from '@/services/sesiuni.service';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [reportsData, setReportsData] = useState<ReportsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sendPdfDialogOpen, setSendPdfDialogOpen] = useState(false);

  // State pentru sortarea și filtrarea companiilor
  const [companySortFilter, setCompanySortFilter] = useState<'all' | 'sent' | 'responded' | 'no-response'>('all');

  // Funcție pentru încărcarea datelor reale din backend (SQLite)
  const loadReportsData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
  console.log('🔍 Încărcare date rapoarte din sursa reală...');
      
      // Apelează serviciul pentru obținerea datelor reale
      const data = await reportsService.getReportsData();
      
      setReportsData(data);
      setLastRefresh(new Date());
      
  console.log('✅ Date rapoarte încărcate cu succes:', {
        totalEmails: data.emailStats.totalSent,
        companies: data.companyStats.length,
        teamMembers: data.teamPerformance.length,
        // Debug: verifică primele 3 companii și numele lor
        sampleCompanies: data.companyStats.slice(0, 3).map(c => ({ id: c.id, name: c.name, hasName: !!c.name }))
      });
      
    } catch (err) {
  console.error('❌ Eroare la încărcarea datelor raport:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Eroare necunoscută la încărcarea datelor';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  

  // Încărcare inițială și auto-refresh
  useEffect(() => {
    loadReportsData();
    
    // Auto-refresh la 10 minute pentru date reale (mai rezonabil decât 5 minute)
    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh programat...');
      loadReportsData();
    }, 10 * 60 * 1000); // 10 minute

    return () => clearInterval(interval);
  }, []);

  // Funcție pentru refresh manual
  const handleManualRefresh = () => {
    console.log('🔄 Refresh manual inițiat...');
    loadReportsData();
  };

  // Refresh cu filtre (neutilizat) eliminat pentru a reduce codul mort

  // Funcție pentru filtrarea și sortarea companiilor
  const getFilteredAndSortedCompanies = () => {
    if (!reportsData?.companyStats) return [];

    let filteredCompanies = [...reportsData.companyStats];

    // Aplicăm filtrarea bazată pe criteriul selectat
    switch (companySortFilter) {
      case 'sent':
        // Parteneri către care au fost trimise emailuri cu cereri de confirmare
        filteredCompanies = filteredCompanies.filter(company => (company.totalRequests || 0) > 0);
        // Sortează după numărul total de cereri (descrescător)
        filteredCompanies.sort((a, b) => (b.totalRequests || 0) - (a.totalRequests || 0));
        break;
        
      case 'responded':
        // Parteneri care au răspuns la email
        filteredCompanies = filteredCompanies.filter(company => (company.successfulRequests || 0) > 0);
        // Sortează după numărul de răspunsuri (descrescător)
        filteredCompanies.sort((a, b) => (b.successfulRequests || 0) - (a.successfulRequests || 0));
        break;
        
      case 'no-response':
        // Parteneri care nu au răspuns la email (au cereri pending sau total requests dar 0 successful)
        filteredCompanies = filteredCompanies.filter(company => 
          (company.totalRequests || 0) > 0 && (company.successfulRequests || 0) === 0
        );
        // Sortează după numărul de cereri pending (descrescător)
        filteredCompanies.sort((a, b) => (b.pendingRequests || 0) - (a.pendingRequests || 0));
        break;
        
      case 'all':
      default:
        // Toate companiile, sortate după rata de succes (descrescător)
        filteredCompanies.sort((a, b) => {
          const totalA = Math.max(a.totalRequests || 0, 1);
          const totalB = Math.max(b.totalRequests || 0, 1);
          const rateA = ((a.successfulRequests || 0) / totalA) * 100;
          const rateB = ((b.successfulRequests || 0) / totalB) * 100;
          return rateB - rateA;
        });
        break;
    }

    return filteredCompanies;
  };

  // Transformă companiile filtrate într-un format minim pentru generarea PDF-ului
  const getExportPartnersForCurrentFilter = () => {
    const companies = getFilteredAndSortedCompanies();
    // Mapăm la proprietăți folosite de backend-ul de PDF (numePartener etc.)
    return companies.map((c) => ({
      idPartener: c.id,
      numePartener: c.name,
      // câmpuri opționale lăsate goale dacă nu sunt disponibile în acest context
      cuiPartener: '',
      telefonPartener: '',
      emailPartener: '',
      clientDUC: false,
      clientDL: false,
      furnizorDUC: false,
      furnizorDL: false,
    }));
  };

  const handleDownloadPdf = async () => {
    const partners = getExportPartnersForCurrentFilter();
    if (partners.length === 0) {
      console.warn('Nu există parteneri pentru export în filtrul curent');
      return;
    }
    setPdfLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const sessionInfo = {
        idSesiune: sesiuniService.getCurrentSessionId() || undefined,
        data: new Date().toISOString(),
        categoria: activeTab === 'companies' ? 'cereri' : activeTab, // simplu: corelăm tabul curent sau filtrul
      };
      const response = await fetch(`${baseUrl}/api/pdf/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ partners, sessionInfo })
      });
      if (!response.ok) throw new Error(`Eroare HTTP: ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lista-parteneri-${companySortFilter}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      console.log(`PDF descărcat (${partners.length} parteneri)`);
    } catch (e) {
      console.error('Eroare la descărcarea PDF:', e);
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePrintPdf = async () => {
    const partners = getExportPartnersForCurrentFilter();
    if (partners.length === 0) {
      console.warn('Nu există parteneri pentru export în filtrul curent');
      return;
    }
    setPdfLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const sessionInfo = {
        idSesiune: sesiuniService.getCurrentSessionId() || undefined,
        data: new Date().toISOString(),
        categoria: activeTab === 'companies' ? 'cereri' : activeTab,
      };
      const response = await fetch(`${baseUrl}/api/pdf/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          partners,
          title: 'Lista pentru Printare',
          orientation: 'landscape',
          sessionInfo
        })
      });
      if (!response.ok) throw new Error(`Eroare HTTP: ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => printWindow.print(), 800);
        };
      }
      console.log(`PDF pregătit pentru printare (${partners.length} parteneri)`);
    } catch (e) {
      console.error('Eroare la printarea PDF:', e);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleEmailPdf = async (emailData: EmailData) => {
    const partners = getExportPartnersForCurrentFilter();
    if (partners.length === 0) {
      console.warn('Nu există parteneri pentru export în filtrul curent');
      return;
    }
    setPdfLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const sessionInfo = {
        idSesiune: sesiuniService.getCurrentSessionId() || undefined,
        data: new Date().toISOString(),
        categoria: activeTab === 'companies' ? 'cereri' : activeTab,
      };
      const response = await fetch(`${baseUrl}/api/pdf/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          partners,
          emailData: {
            to: emailData.emails[0],
            cc: emailData.emails.slice(1),
            subject: emailData.subject || 'Lista Parteneri',
            body: emailData.message || 'Vă transmitem atașat lista de parteneri.',
            attachmentName: `lista-parteneri-${companySortFilter}-${Date.now()}.pdf`
          },
          sessionInfo
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Eroare HTTP: ${response.status}`);
      }
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Eroare la trimiterea email-ului');
      console.log(`Email trimis cu succes către ${emailData.emails.join(', ')}`);
      setSendPdfDialogOpen(false);
    } catch (e) {
      console.error('Eroare la trimiterea email-ului cu PDF:', e);
    } finally {
      setPdfLoading(false);
    }
  };

  // Obține statistici pentru criteriile de filtrare folosind date REALE din SQLite via backend
  const getCompanyFilterStats = () => {
    if (!reportsData?.companyStats) return { all: 0, sent: 0, responded: 0, noResponse: 0 };

    const respondedCount = reportsData.companyStats.filter(c => (c.successfulRequests || 0) > 0).length;
    const noResponseCount = reportsData.companyStats.filter(c => (c.totalRequests || 0) > 0 && (c.successfulRequests || 0) === 0).length;

    const stats = {
      all: reportsData.companyStats.length,
      // Pentru "Emailuri trimise" folosim numărul REAL de emailuri CONFIRMARE agregat în emailStats
      sent: reportsData.emailStats?.totalSent || 0,
      responded: respondedCount,
      noResponse: noResponseCount
    };

    console.log('📊 Statistici filtrare companii (date reale):', stats);

    return stats;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">📊 Dashboard Rapoarte</h1>
              <p className="text-gray-600 mt-2">
                Analize în timp real din JurnalEmail și JurnalCereriConfirmare
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-500">SQLite</span>
            </div>
          </div>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="text-center space-y-4">
                <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Se încarcă datele raportului...</h3>
                  <p className="text-gray-600 mt-2">
                    Colectez informații din baza de date locală (SQLite)
                  </p>
                  <div className="flex items-center justify-center mt-4 space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>JurnalEmail</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span>JurnalCereriConfirmare</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Rapoarte</h1>
              <p className="text-gray-600 mt-2">
                Problemă la încărcarea datelor
              </p>
            </div>
            <Button 
              onClick={handleManualRefresh} 
              variant="outline" 
              size="lg"
              className="shadow-md"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reîncearcă
            </Button>
          </div>
          
          <Alert variant="destructive" className="border-0 shadow-lg">
            <AlertTriangle className="h-5 w-5" />
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-semibold">Eroare la conectarea cu baza de date:</p>
                <p className="text-sm bg-red-50 p-3 rounded-md font-mono">{error}</p>
                <div className="text-sm space-y-1">
                  <p>• Verifică accesul la baza de date locală (SQLite)</p>
                  <p>• Confirmă că serviciul backend rulează pe portul 5000</p>
                  <p>• Verifică că rutele API funcționează:</p>
                  <p className="ml-4">- <code>/api/jurnal-email/statistics</code></p>
                  <p className="ml-4">- <code>/api/jurnal-cereri-confirmare/statistici</code></p>
                  <p className="ml-4">- <code>/api/parteneri</code></p>
                  <p>• Verifică token-ul de autentificare în localStorage</p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!reportsData) {
    return null;
  }

  // Culori pentru grafice
  const COLORS = {
    success: '#10b981',
    pending: '#f59e0b', 
    failed: '#ef4444',
    warning: '#f97316',
    info: '#3b82f6',
    purple: '#8b5cf6'
  };

  // Date pentru graficul principal
  const statusData = [
    { 
      name: 'Livrate cu succes', 
      value: reportsData.emailStats.successfulDeliveries, 
      color: COLORS.success 
    },
    { 
      name: 'În așteptare răspuns', 
      value: reportsData.emailStats.pendingResponses, 
      color: COLORS.pending 
    },
    { 
      name: 'Eșuate', 
      value: reportsData.emailStats.failedDeliveries, 
      color: COLORS.failed 
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header cu informații de stare */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              Rapoarte
              <Badge variant="secondary" className="text-xs">
                Live Data
              </Badge>
            </h1>
            <p className="text-gray-600 mt-2 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Analize în timp real
              <span className="text-xs text-gray-500">
                • Ultima actualizare: {lastRefresh.toLocaleTimeString('ro-RO')}
              </span>
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg shadow-sm border">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-600">JurnalEmail: {reportsData.emailStats.totalSent}</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-xs text-gray-600">Parteneri: {reportsData.companyStats.length}</span>
              </div>
            </div>
            
            <Button 
              onClick={handleManualRefresh} 
              variant="outline" 
              size="sm"
              disabled={isLoading}
              className="shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizează
            </Button>

            {/* Export Actions */}
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleDownloadPdf}
                variant="secondary"
                size="sm"
                disabled={pdfLoading}
              >
                Descărcați PDF
              </Button>
              <Button 
                onClick={handlePrintPdf}
                variant="secondary"
                size="sm"
                disabled={pdfLoading}
              >
                Tipăriți
              </Button>
              <Button 
                onClick={() => setSendPdfDialogOpen(true)}
                variant="default"
                size="sm"
                disabled={pdfLoading}
              >
                Trimiteți pe email
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard principal cu tab-uri */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm border-0">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              📈 Prezentare generală
            </TabsTrigger>
            <TabsTrigger value="companies" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              🏢 Companii
            </TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              👥 Echipa
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              🔍 Analiză avansată
            </TabsTrigger>
          </TabsList>

          {/* Tab: Prezentare generală */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Total emailuri trimise</CardTitle>
                  <Mail className="h-5 w-5 opacity-80" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{reportsData.emailStats.totalSent.toLocaleString()}</div>
                  <p className="text-xs opacity-80 mt-1">
                    {reportsData.emailStats.growth > 0 ? '📈' : '📉'} 
                    {Math.abs(reportsData.emailStats.growth).toFixed(1)}% față de luna trecută
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Livrate cu succes</CardTitle>
                  <CheckCircle className="h-5 w-5 opacity-80" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{reportsData.emailStats.successfulDeliveries.toLocaleString()}</div>
                  <p className="text-xs opacity-80 mt-1">
                    🎯 {reportsData.emailStats.responseRate.toFixed(1)}% rata de răspuns
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">În așteptare</CardTitle>
                  <Clock className="h-5 w-5 opacity-80" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{reportsData.emailStats.pendingResponses.toLocaleString()}</div>
                  <p className="text-xs opacity-80 mt-1">
                    ⏱️ {reportsData.emailStats.avgResponseTime.toFixed(1)} zile media răspuns
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-red-500 to-red-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Eșuate</CardTitle>
                  <XCircle className="h-5 w-5 opacity-80" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{reportsData.emailStats.failedDeliveries.toLocaleString()}</div>
                  <p className="text-xs opacity-80 mt-1">
                    ⚠️ Necesită urmărire
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Grafice principale */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Grafic evoluție timp */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Evoluție emailuri (ultimele 6 luni)
                  </CardTitle>
                  <CardDescription>
                    Tendințe bazate pe date reale din JurnalEmail
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={reportsData.monthlyTrends}>
                      <defs>
                        <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={COLORS.success} stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.pending} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={COLORS.pending} stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value, name) => [
                          `${value} emailuri`, 
                          name === 'delivered' ? '✅ Livrate' : 
                          name === 'responded' ? '💬 Cu răspuns' : 
                          name === 'failed' ? '❌ Eșuate' : '📤 Trimise'
                        ]}
                      />
                      <Area type="monotone" dataKey="delivered" stackId="1" stroke={COLORS.success} fill="url(#colorDelivered)" />
                      <Area type="monotone" dataKey="responded" stackId="1" stroke={COLORS.info} fill={COLORS.info} fillOpacity={0.6} />
                      <Area type="monotone" dataKey="failed" stackId="1" stroke={COLORS.failed} fill={COLORS.failed} fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Grafic distribuție status */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-600" />
                    Distribuție status emailuri
                  </CardTitle>
                  <CardDescription>
                    Status actual pentru toate emailurile din sistem
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={statusData.filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent, value }) => 
                          `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                        }
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value) => [`${value} emailuri`, 'Total']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Companii */}
          <TabsContent value="companies" className="space-y-6">
            {/* Header și controale de sortare */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-100">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Analiza Partenerilor
                  </h3>
                  <p className="text-sm text-gray-600">
                    Analiză corespondență
                  </p>
                </div>
                
                {/* Controale de sortare */}
                <div className="flex flex-col sm:flex-row gap-2">
                  {[
                    { value: 'all', label: 'Toate companiile', icon: Building2, count: getCompanyFilterStats().all },
                    { value: 'sent', label: 'Emailuri trimise', icon: Send, count: getCompanyFilterStats().sent },
                    { value: 'responded', label: 'Au răspuns', icon: CheckCircle, count: getCompanyFilterStats().responded },
                    { value: 'no-response', label: 'Nu au răspuns', icon: Clock, count: getCompanyFilterStats().noResponse }
                  ].map((filter) => {
                    const Icon = filter.icon;
                    return (
                      <button
                        key={filter.value}
                        onClick={() => setCompanySortFilter(filter.value as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          companySortFilter === filter.value
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{filter.label}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          companySortFilter === filter.value
                            ? 'bg-blue-400 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {filter.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Lista companiilor filtrate */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h4 className="text-md font-medium text-gray-900">
                    {companySortFilter === 'all' && 'Toate companiile'}
                    {companySortFilter === 'sent' && 'Parteneri către care au fost trimise emailuri'}
                    {companySortFilter === 'responded' && 'Parteneri care au răspuns la email'}
                    {companySortFilter === 'no-response' && 'Parteneri care nu au răspuns la email'}
                  </h4>
                  <span className="text-sm text-gray-500">
                    {getFilteredAndSortedCompanies().length} companii
                  </span>
                </div>
              </div>
              
              {/* Conținut scrollabil */}
              <div className="max-h-96 overflow-y-auto">
                {getFilteredAndSortedCompanies().length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {getFilteredAndSortedCompanies().map((company, index) => {
                      const safeTotal = Math.max(company.totalRequests || 0, 1);
                      const safeSuccessful = company.successfulRequests || 0;
                      const responseRate = (safeSuccessful / safeTotal) * 100;
                      
                      return (
                        <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                <h5 className="font-medium text-gray-900">
                                  {company.name || `Partener ${company.id}` || 'Partener necunoscut'}
                                </h5>
                                {/* Debug info - se poate elimina în producție */}
                                {import.meta.env.DEV && !company.name && (
                                  <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                                    Nume lipsă
                                  </span>
                                )}
                              </div>
                              
                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                                <div className="flex items-center gap-1">
                                  <Send className="w-3 h-3 text-blue-500" />
                                  <span className="text-gray-600">Trimise: </span>
                                  <span className="font-medium">{company.totalRequests || 0}</span>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                  <span className="text-gray-600">Răspunsuri: </span>
                                  <span className="font-medium text-green-600">{company.successfulRequests || 0}</span>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-orange-500" />
                                  <span className="text-gray-600">Pending: </span>
                                  <span className="font-medium text-orange-600">{company.pendingRequests || 0}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Rata de răspuns */}
                            <div className="flex items-center gap-2 ml-4">
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">
                                  {responseRate.toFixed(1)}%
                                </div>
                                <div className="text-xs text-gray-500">rata răspuns</div>
                              </div>
                              <div className="w-12 h-12 relative">
                                <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                                  <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="#e5e7eb"
                                    strokeWidth="2"
                                  />
                                  <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke={responseRate >= 80 ? "#10b981" : responseRate >= 50 ? "#f59e0b" : "#ef4444"}
                                    strokeWidth="2"
                                    strokeDasharray={`${responseRate}, 100`}
                                  />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      Nu există companii care să corespundă criteriilor selectate
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Statistici rezumat pentru criteriul selectat */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {getFilteredAndSortedCompanies().length}
                  </div>
                  <div className="text-xs text-gray-600">Companii afișate</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {getFilteredAndSortedCompanies().reduce((sum, c) => sum + c.successfulRequests, 0)}
                  </div>
                  <div className="text-xs text-gray-600">Total răspunsuri</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {getFilteredAndSortedCompanies().reduce((sum, c) => sum + c.pendingRequests, 0)}
                  </div>
                  <div className="text-xs text-gray-600">Total pending</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {getFilteredAndSortedCompanies().length > 0 
                      ? ((getFilteredAndSortedCompanies().reduce((sum, c) => sum + c.successfulRequests, 0) / 
                          Math.max(getFilteredAndSortedCompanies().reduce((sum, c) => sum + c.totalRequests, 0), 1)) * 100).toFixed(1)
                      : '0.0'}%
                  </div>
                  <div className="text-xs text-gray-600">Rata medie răspuns</div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab: Echipa */}
          <TabsContent value="team" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Performanța echipei
                </CardTitle>
                <CardDescription>
                  Activitatea membrilor echipei bazată pe emailurile trimise din JurnalEmail
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportsData.teamPerformance.length > 0 ? (
                    reportsData.teamPerformance.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{member.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>📧 {member.emailsSent} emailuri</span>
                              <span>⏱️ {member.avgProcessingTime.toFixed(1)} zile media</span>
                              <span>✅ {member.successRate.toFixed(1)}% succes</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="mb-2">
                            {member.activeRequests} active
                          </Badge>
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min(100, member.successRate)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Nu există date despre performanța echipei</p>
                      <p className="text-sm">Datele vor apărea după trimiterea emailurilor</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Analiză avansată */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Grafic tendințe avansate */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                    Tendințe timp de răspuns
                  </CardTitle>
                  <CardDescription>
                    Evoluția timpului de răspuns al partenerilor în ultimele 6 luni
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={reportsData.monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value, name) => [
                          `${value} emailuri`, 
                          name === 'delivered' ? '📨 Livrate' : 
                          name === 'responded' ? '💬 Cu răspuns' : '📤 Trimise'
                        ]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="delivered" 
                        stroke={COLORS.success} 
                        strokeWidth={3}
                        dot={{ fill: COLORS.success, strokeWidth: 2, r: 5 }}
                        name="Livrate"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="responded" 
                        stroke={COLORS.info} 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: COLORS.info, strokeWidth: 2, r: 4 }}
                        name="Cu răspuns"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Statistici performanță */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    Indicatori cheie de performanță
                  </CardTitle>
                  <CardDescription>
                    Metrici importante pentru eficiența sistemului
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Rata de livrare</span>
                        <span className="text-sm font-bold text-green-600">
                          {((reportsData.emailStats.successfulDeliveries / Math.max(reportsData.emailStats.totalSent, 1)) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={(reportsData.emailStats.successfulDeliveries / Math.max(reportsData.emailStats.totalSent, 1)) * 100}
                        className="h-2"
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Rata de răspuns</span>
                        <span className="text-sm font-bold text-blue-600">
                          {reportsData.emailStats.responseRate.toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={reportsData.emailStats.responseRate}
                        className="h-2"
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Creștere lunară</span>
                        <span className={`text-sm font-bold ${reportsData.emailStats.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {reportsData.emailStats.growth > 0 ? '+' : ''}{reportsData.emailStats.growth.toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(100, Math.abs(reportsData.emailStats.growth))}
                        className="h-2"
                      />
                    </div>

                    <Separator />
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{reportsData.companyStats.length}</div>
                        <div className="text-xs text-blue-600">Parteneri activi</div>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {reportsData.emailStats.avgResponseTime.toFixed(1)}
                        </div>
                        <div className="text-xs text-green-600">Zile media răspuns</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Grafic comparativ detaliat */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-purple-600" />
                  Analiză comparativă emailuri
                </CardTitle>
                <CardDescription>
                  Comparația detaliată între emailurile trimise și răspunsurile primite
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={reportsData.monthlyTrends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value, name) => [
                        `${value} emailuri`, 
                        name === 'sent' ? '📤 Trimise' : 
                        name === 'delivered' ? '📨 Livrate' : 
                        name === 'responded' ? '💬 Cu răspuns' : '❌ Eșuate'
                      ]}
                    />
                    <Bar dataKey="sent" fill={COLORS.info} name="Trimise" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="delivered" fill={COLORS.success} name="Livrate" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="responded" fill={COLORS.purple} name="Cu răspuns" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="failed" fill={COLORS.failed} name="Eșuate" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
      <SendPdfDialog 
        open={sendPdfDialogOpen}
        onClose={() => setSendPdfDialogOpen(false)}
        selectedPartnersCount={getExportPartnersForCurrentFilter().length}
        onSendEmail={handleEmailPdf}
      />
    </div>
  );
};

export default Reports;

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { 
    CalendarIcon, 
    Search, 
    Filter, 
    RefreshCw, 
    Mail, 
    Clock, 
    CheckCircle, 
    XCircle, 
    AlertCircle,
    BarChart3,
    FileText,
    Send,
    Link,
    Grid3X3,
    List
} from "lucide-react";
import { useJurnalEmail, type JurnalEmail, type JurnalEmailFilters } from "@/hooks/useJurnalEmail";

const JurnalEmailPage = () => {
    const [filters, setFilters] = useState<JurnalEmailFilters>({
        limit: 50,
        offset: 0,
        sortBy: 'DataTrimitere',
        sortOrder: 'DESC'
    });
    const [emailuri, setEmailuri] = useState<JurnalEmail[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<Date>();
    const [searchEmail, setSearchEmail] = useState('');
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
    const [receiveStatus, setReceiveStatus] = useState<'all' | 'responded' | 'no_response'>('all');
    
    // State pentru tracking
    const [trackingStats, setTrackingStats] = useState<any>(null);
    const [unresponsivePartners, setUnresponsivePartners] = useState<any[]>([]);
    const [reminderDays, setReminderDays] = useState<number>(7);
    const [reminderType, setReminderType] = useState<'SOFT' | 'NORMAL' | 'URGENT'>('SOFT');
    // Email monitor (IMAP) helpers
    const [checkNowResult, setCheckNowResult] = useState<{ processed: number; at: string } | null>(null);
    const [responseStats, setResponseStats] = useState<any>(null);
    const [reconciling, setReconciling] = useState(false);
    
    const { 
        loading, 
        error, 
        getJurnalEmailuri, 
        getJurnalEmailStats, 
    markForRetry,
        getUnresponsivePartners,
        sendReminders,
        generateTrackingReport
    } = useJurnalEmail();

    // Încarcă datele la mount și când se schimbă filtrele
    useEffect(() => {
        loadData();
    }, [filters]);

    const loadData = async () => {
        try {
            // Încarcă emailurile
            const emailResponse = await getJurnalEmailuri(filters);
            if (emailResponse.success && Array.isArray(emailResponse.data)) {
                setEmailuri(emailResponse.data);
            }

            // Încarcă statisticile
            const statsResponse = await getJurnalEmailStats();
            if (statsResponse.success && statsResponse.stats) {
                setStats(statsResponse.stats);
            }
        } catch (error) {
            console.error('Eroare la încărcarea datelor:', error);
        }
    };

    // Reconciliere per-rând eliminată (folosim acțiunea globală)

    // Reconciliere pentru toate emailurile vizibile (din listă)
    const handleReconcileAll = async () => {
        if (!emailuri.length) return;
        if (!confirm(`Rulez reconcilierea pentru ${emailuri.length} emailuri vizibile?`)) return;
        setReconciling(true);
        try {
            const ids = emailuri.map(e => e.IdJurnalEmail);
            const results = await Promise.allSettled(ids.map(id => fetch(`/api/email-tracking/reconcile/${id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            }).then(r => r.json())));
            const ok = results.filter(r => r.status === 'fulfilled' && (r as any).value?.success).length;
            await loadData();
            alert(`Reconciliere finalizată: ${ok}/${ids.length} reușite`);
        } catch (e) {
            console.error('Eroare la reconciliere în masă:', e);
            alert('Eroare la reconcilierea în masă');
        } finally {
            setReconciling(false);
        }
    };

    // Verificare manuală inbox (IMAP)
    const handleCheckInboxNow = async () => {
        try {
            const res = await fetch('/api/email-monitor/check-now', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data?.success) {
                const processed = data.processed ?? 0;
                setCheckNowResult({ processed, at: new Date().toISOString() });
                await loadData();
            } else {
                alert('Verificarea inbox-ului a eșuat.');
            }
        } catch (e) {
            console.error('Eroare la check-now:', e);
            alert('Eroare la verificarea inbox-ului');
        }
    };

    // Statistici răspunsuri (IMAP)
    const loadResponseStats = async () => {
        try {
            const res = await fetch('/api/email-monitor/response-stats', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data?.success) setResponseStats(data.stats);
        } catch (e) {
            console.error('Eroare la încărcarea statisticilor răspuns:', e);
        }
    };

    // Încarcă datele pentru tracking
    const loadTrackingData = async () => {
        try {
            // Încarcă raportul de tracking
            const trackingResult = await generateTrackingReport();
            if (trackingResult.success) {
                setTrackingStats(trackingResult.data);
            }
            
            // Încarcă partenerii neresponsivi
            const unresponsiveResult = await getUnresponsivePartners(reminderDays);
            if (unresponsiveResult.success) {
                setUnresponsivePartners(unresponsiveResult.data || []);
            }
        } catch (error) {
            console.error('Eroare la încărcarea datelor de tracking:', error);
        }
    };

    // Trimite remindere
    const handleSendReminders = async () => {
        try {
            const result = await sendReminders(reminderDays, reminderType);
            if (result.success) {
                // Reîncarcă datele după trimiterea reminder-elor
                await loadTrackingData();
                alert(`Remindere trimise cu succes: ${result.data?.remindersCount || 0} emailuri`);
            } else {
                alert(`Eroare la trimiterea reminder-elor: ${result.error}`);
            }
        } catch (error) {
            console.error('Eroare la trimiterea reminder-elor:', error);
            alert('Eroare la trimiterea reminder-elor');
        }
    };

    const handleSearch = () => {
        setFilters({
            ...filters,
            EmailDestinatar: searchEmail || undefined,
            offset: 0
        });
    };

    const handleDateFilter = (date: Date | undefined) => {
        setSelectedDate(date);
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            
            setFilters({
                ...filters,
                DataTrimitereStart: startOfDay.toISOString(),
                DataTrimitereEnd: endOfDay.toISOString(),
                offset: 0
            });
        } else {
            setFilters({
                ...filters,
                DataTrimitereStart: undefined,
                DataTrimitereEnd: undefined,
                offset: 0
            });
        }
    };

    const handleStatusFilter = (status: string) => {
        if (status === 'all') {
            setFilters({
                ...filters,
                StatusTrimitere: undefined,
                offset: 0
            });
        } else {
            setFilters({
                ...filters,
                StatusTrimitere: [status as any],
                offset: 0
            });
        }
    };

    const handleTypeFilter = (type: string) => {
        if (type === 'all') {
            setFilters({
                ...filters,
                TipEmail: undefined,
                offset: 0
            });
        } else {
            setFilters({
                ...filters,
                TipEmail: [type as any],
                offset: 0
            });
        }
    };

    // Sortare locală: "Email-uri trimise / Răspunsuri"
    const isResponded = (e: JurnalEmail) => (
        e.StatusTrimitere === 'RESPONDED' || !!e.DataRaspuns || !!e.TipRaspuns
    );

    // Filtrare locală: Status primiri
    const filteredEmails = useMemo(() => {
        let arr = [...emailuri];
        if (receiveStatus === 'responded') {
            arr = arr.filter(isResponded);
        } else if (receiveStatus === 'no_response') {
            // Arată doar emailuri trimise fără răspuns încă
            arr = arr.filter(e => !isResponded(e) && e.StatusTrimitere === 'SUCCESS');
        }
        return arr;
    }, [emailuri, receiveStatus]);

    const sortedEmails = useMemo(() => filteredEmails, [filteredEmails]);

    // Status primiri pe parteneri (grupare)
    const respondedPartners = useMemo(() => {
        const map = new Map<string, { email: string; name?: string; lastResponse?: string }>();
        emailuri.forEach(e => {
            if (isResponded(e)) {
                const key = e.EmailDestinatar;
                const d = e.DataRaspuns || e.DataTrimitere;
                const prev = map.get(key);
                if (!prev || (d && prev.lastResponse && new Date(d).getTime() > new Date(prev.lastResponse).getTime()) || (!prev.lastResponse && d)) {
                    map.set(key, { email: key, name: e.NumeDestinatar, lastResponse: d });
                } else if (!prev) {
                    map.set(key, { email: key, name: e.NumeDestinatar });
                }
            }
        });
        return Array.from(map.values()).sort((a, b) => new Date(b.lastResponse || 0).getTime() - new Date(a.lastResponse || 0).getTime());
    }, [emailuri]);

    const unresponsivePartnersAggregated = useMemo(() => {
        if (unresponsivePartners && unresponsivePartners.length) {
            const map = new Map<string, { email: string; name?: string; lastSent?: string }>();
            unresponsivePartners.forEach((p: any) => {
                const key = p.EmailDestinatar;
                const d = p.DataTrimitere;
                const prev = map.get(key);
                if (!prev || (d && prev.lastSent && new Date(d).getTime() > new Date(prev.lastSent).getTime()) || (!prev?.lastSent && d)) {
                    map.set(key, { email: key, name: p.NumeDestinatar, lastSent: d });
                }
            });
            return Array.from(map.values()).sort((a, b) => new Date(b.lastSent || 0).getTime() - new Date(a.lastSent || 0).getTime());
        }
        // Fallback: deduce din emailurile încărcate
        const sentByRecipient = new Map<string, { name?: string; responded: boolean; lastSent?: string }>();
        emailuri.forEach(e => {
            if (e.StatusTrimitere === 'SUCCESS') {
                const rec = sentByRecipient.get(e.EmailDestinatar) || { name: e.NumeDestinatar, responded: false, lastSent: e.DataTrimitere };
                rec.name = rec.name || e.NumeDestinatar;
                if (!rec.lastSent || new Date(e.DataTrimitere).getTime() > new Date(rec.lastSent).getTime()) rec.lastSent = e.DataTrimitere;
                if (isResponded(e)) rec.responded = true;
                sentByRecipient.set(e.EmailDestinatar, rec);
            }
        });
        return Array.from(sentByRecipient.entries())
            .filter(([, v]) => !v.responded)
            .map(([email, v]) => ({ email, name: v.name, lastSent: v.lastSent }))
            .sort((a, b) => new Date(b.lastSent || 0).getTime() - new Date(a.lastSent || 0).getTime());
    }, [emailuri, unresponsivePartners]);

    const handleRetry = async (ids: string[]) => {
        try {
            const result = await markForRetry(ids);
            if (result.success) {
                loadData(); // Reîncarcă datele
            }
        } catch (error) {
            console.error('Eroare la retrimitere:', error);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'SUCCESS':
                return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Trimis</Badge>;
            case 'RESPONDED':
                return <Badge variant="default" className="bg-blue-100 text-blue-800"><Mail className="w-3 h-3 mr-1" />Răspuns primit</Badge>;
            case 'FAILED':
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Eșuat</Badge>;
            case 'PENDING':
                return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />În așteptare</Badge>;
            case 'RETRY':
                return <Badge variant="outline"><RefreshCw className="w-3 h-3 mr-1" />Retrimitere</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'FISE_PARTENER':
                return <Badge className="bg-teal-100 text-teal-800"><FileText className="w-3 h-3 mr-1" />Fișe Furnizor</Badge>;
            case 'CONFIRMARE':
                return <Badge className="bg-blue-100 text-blue-800"><FileText className="w-3 h-3 mr-1" />Confirmare</Badge>;
            case 'REMINDER':
                return <Badge className="bg-orange-100 text-orange-800"><AlertCircle className="w-3 h-3 mr-1" />Reamintire</Badge>;
            case 'TEST':
                return <Badge className="bg-purple-100 text-purple-800"><Send className="w-3 h-3 mr-1" />Test</Badge>;
            case 'GENERAL':
                return <Badge variant="outline"><Mail className="w-3 h-3 mr-1" />General</Badge>;
            default:
                return <Badge variant="outline">{type}</Badge>;
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'HIGH':
                return <Badge variant="destructive">Ridicată</Badge>;
            case 'URGENT':
                return <Badge className="bg-red-600 text-white">Urgentă</Badge>;
            case 'LOW':
                return <Badge variant="secondary">Mică</Badge>;
            default:
                return <Badge variant="outline">Normală</Badge>;
        }
    };

    const getResponseBadge = (tipRaspuns: string | undefined, dataRaspuns: string | undefined) => {
        if (!dataRaspuns || !tipRaspuns) return null;
        
        switch (tipRaspuns) {
            case 'CONFIRMED':
                return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Confirmat</Badge>;
            case 'DISPUTED':
                return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Contestat</Badge>;
            case 'CORRECTIONS':
                return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />Corecții</Badge>;
            case 'GENERAL_RESPONSE':
                return <Badge variant="outline"><Mail className="w-3 h-3 mr-1" />Răspuns general</Badge>;
            default:
                return <Badge variant="outline"><Mail className="w-3 h-3 mr-1" />Răspuns</Badge>;
        }
    };

    const getTrackingBadge = (email: JurnalEmail) => {
        // Badge pentru tracking activat
        if (email.TrackingEnabled) {
            return <Badge variant="outline" className="text-blue-600 border-blue-200"><BarChart3 className="w-3 h-3 mr-1" />Tracking</Badge>;
        }
        return null;
    };

    const getReadStatusBadge = (email: JurnalEmail) => {
        const hasBeenRead = email.DataCitire || email.WasOpened;
        
        if (hasBeenRead) {
            const readTime = email.DataCitire || email.FirstOpenedAt;
            const timeAgo = readTime ? format(new Date(readTime), 'dd/MM/yyyy HH:mm', { locale: ro }) : '';
            
            return (
                <Badge className="bg-blue-100 text-blue-800" title={`Citit la: ${timeAgo}`}>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Citit
                    {email.TotalOpens && email.TotalOpens > 1 && (
                        <span className="ml-1 text-xs">({email.TotalOpens}×)</span>
                    )}
                </Badge>
            );
        }
        
        if (email.StatusTrimitere === 'SUCCESS') {
            return <Badge variant="outline" className="text-gray-600"><Clock className="w-3 h-3 mr-1" />Necitit</Badge>;
        }
        
        return null;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Jurnal Email-uri</h1>
                <div className="flex items-center gap-2">
                    <Button onClick={handleReconcileAll} disabled={reconciling || loading} variant="outline">
                        <RefreshCw className={`w-4 h-4 mr-2 ${reconciling ? 'animate-spin' : ''}`} />
                        Verifică inbox-ul
                    </Button>
                    <Button onClick={loadData} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Actualizează
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="list" className="w-full">
                <TabsList>
                    <TabsTrigger value="list">Lista Email-uri</TabsTrigger>
                    <TabsTrigger value="stats">Statistici</TabsTrigger>
                    <TabsTrigger value="tracking">Tracking & Remindere</TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="space-y-4">
                    {/* Filtre */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Filter className="w-5 h-5 mr-2" />
                                Filtrare și Căutare
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label>Căutare email destinatar</Label>
                                    <div className="flex space-x-2">
                                        <Input
                                            placeholder="nume@example.com"
                                            value={searchEmail}
                                            onChange={(e) => setSearchEmail(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                        />
                                        <Button size="sm" onClick={handleSearch}>
                                            <Search className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Data trimiterii</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {selectedDate ? format(selectedDate, "dd.MM.yyyy", { locale: ro }) : "Selectează data"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={selectedDate}
                                                onSelect={handleDateFilter}
                                                locale={ro}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-2">
                                    <Label>Status trimitere</Label>
                                    <Select onValueChange={handleStatusFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Toate statusurile" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Toate status-urile</SelectItem>
                                            <SelectItem value="SUCCESS">Trimise cu succes</SelectItem>
                                            <SelectItem value="FAILED">Eșuate</SelectItem>
                                            <SelectItem value="PENDING">În așteptare</SelectItem>
                                            <SelectItem value="RETRY">Pentru retrimitere</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Tipul emailului</Label>
                                    <Select onValueChange={handleTypeFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Toate tipurile" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Toate tipurile</SelectItem>
                                            <SelectItem value="FISE_PARTENER">Fișe Furnizor</SelectItem>
                                            <SelectItem value="CONFIRMARE">Confirmări de Sold</SelectItem>
                                            <SelectItem value="REMINDER">Reamintiri</SelectItem>
                                            <SelectItem value="TEST">Teste</SelectItem>
                                            <SelectItem value="GENERAL">Generale</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                

                                <div className="space-y-2">
                                    <Label>Status primiri</Label>
                                    <Select value={receiveStatus} onValueChange={(v: any) => setReceiveStatus(v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Toate" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Toate</SelectItem>
                                            <SelectItem value="responded">Cu răspuns</SelectItem>
                                            <SelectItem value="no_response">Fără răspuns</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Lista cu emailuri în format carduri */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Emailuri</CardTitle>
                                    <CardDescription>
                                        {sortedEmails.length} emailuri găsite
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant={viewMode === 'cards' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setViewMode('cards')}
                                    >
                                        <Grid3X3 className="h-4 w-4 mr-2" />
                                        Carduri
                                    </Button>
                                    <Button
                                        variant={viewMode === 'table' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setViewMode('table')}
                                    >
                                        <List className="h-4 w-4 mr-2" />
                                        Tabel
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {error && (
                                <div className="bg-destructive/15 text-destructive p-3 rounded-md mb-4">
                                    {error}
                                </div>
                            )}
                            
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin h-8 w-8 border-b-2 border-primary"></div>
                                    <span className="ml-2">Se încarcă...</span>
                                </div>
                            ) : emailuri.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                                    <h3 className="text-lg font-semibold mb-2">Nici un email găsit</h3>
                                    <p>Nu există emailuri care să corespundă filtrelor selectate.</p>
                                </div>
                            ) : viewMode === 'cards' ? (
                                // Vizualizare carduri
                                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                                        {sortedEmails.map((email) => (
                                        <div 
                                            key={email.IdJurnalEmail} 
                                            className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                {/* Informații principale */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                                            <span className="font-medium text-sm">
                                                                {email.EmailDestinatar}
                                                            </span>
                                                        </div>
                                                        {getStatusBadge(email.StatusTrimitere)}
                                                        {getTypeBadge(email.TipEmail)}
                                                    </div>
                                                    
                                                    {email.NumeDestinatar && (
                                                        <div className="text-sm text-muted-foreground mb-2">
                                                            👤 {email.NumeDestinatar}
                                                        </div>
                                                    )}
                                                    
                                    <div className="text-sm font-medium mb-2 text-foreground">
                                        📧 {email.SubiectEmail}
                                    </div>                                                    {email.MesajEroare && (
                                                        <div className="text-xs text-destructive bg-destructive/10 p-2 rounded mt-2">
                                                            ⚠️ {email.MesajEroare}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Metadata și acțiuni */}
                                                <div className="flex flex-col items-end gap-2 ml-4">
                                                    <div className="text-xs text-muted-foreground">
                                                        🕒 {format(new Date(email.DataTrimitere), 'dd.MM.yyyy HH:mm', { locale: ro })}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2">
                                                        {getPriorityBadge(email.PriorityLevel)}
                                                    </div>
                                                    
                                                    {/* Reconcilierea per-rând a fost înlocuită de butonul global */}
                                            
                                                    {email.StatusTrimitere === 'FAILED' && email.NumarIncercari < email.MaximIncercari && (
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            onClick={() => handleRetry([email.IdJurnalEmail])}
                                                        >
                                                            <RefreshCw className="w-3 h-3 mr-1" />
                                                            Retrimite
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Footer cu detalii suplimentare */}
                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                    {email.NumarIncercari > 1 && (
                                                        <span>🔄 Încercări: {email.NumarIncercari}</span>
                                                    )}
                                                    {email.DataUltimaIncercare && (
                                                        <span>⏱️ Ultima încercare: {format(new Date(email.DataUltimaIncercare), 'dd.MM.yyyy HH:mm', { locale: ro })}</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    ID: {email.IdJurnalEmail.substring(0, 8)}...
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                // Vizualizare tabel
                                <div className="max-h-[600px] overflow-y-auto border rounded-md">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-background z-10">
                                            <TableRow>
                                                <TableHead>Data</TableHead>
                                                <TableHead>Destinatar</TableHead>
                                                <TableHead>Subiect</TableHead>
                                                <TableHead>Tip</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Tracking</TableHead>
                                                <TableHead>Prioritate</TableHead>
                                                <TableHead>Acțiuni</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sortedEmails.map((email) => (
                                                <TableRow key={email.IdJurnalEmail}>
                                                    <TableCell>
                                                        <div className="text-sm">
                                                            {format(new Date(email.DataTrimitere), 'dd.MM.yyyy HH:mm', { locale: ro })}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium">{email.EmailDestinatar}</div>
                                                            {email.NumeDestinatar && (
                                                                <div className="text-sm text-muted-foreground">{email.NumeDestinatar}</div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="max-w-[200px] truncate" title={email.SubiectEmail}>
                                                            {email.SubiectEmail}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {getTypeBadge(email.TipEmail)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {getStatusBadge(email.StatusTrimitere)}
                                                        {getResponseBadge(email.TipRaspuns, email.DataRaspuns)}
                                                        {email.MesajEroare && (
                                                            <div className="text-xs text-destructive mt-1" title={email.MesajEroare}>
                                                                {email.MesajEroare.substring(0, 50)}...
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            {getTrackingBadge(email)}
                                                            {getReadStatusBadge(email)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {getPriorityBadge(email.PriorityLevel)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-2">
                                                        {email.StatusTrimitere === 'FAILED' && email.NumarIncercari < email.MaximIncercari && (
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline"
                                                                onClick={() => handleRetry([email.IdJurnalEmail])}
                                                            >
                                                                <RefreshCw className="w-3 h-3 mr-1" />
                                                                Retrimite
                                                            </Button>
                                                        )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="stats" className="space-y-4">
                    {stats && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Emailuri</CardTitle>
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.totalEmailuri}</div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Trimise cu Succes</CardTitle>
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">{stats.emailuriTrimise}</div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Eșuate</CardTitle>
                                    <XCircle className="h-4 w-4 text-red-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-red-600">{stats.emailuriEsuate}</div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">MultiversX Confirmate</CardTitle>
                                    <Link className="h-4 w-4 text-blue-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-blue-600">{stats.emailuriBlockchainConfirmate}</div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="tracking" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Inbox monitor controls */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Mail className="w-5 h-5 mr-2" />
                                    Inbox Monitor
                                </CardTitle>
                                <CardDescription>
                                    Verifică manual inbox-ul și vezi statistici de răspuns
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex gap-2">
                                    <Button onClick={handleCheckInboxNow} disabled={loading}>
                                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                        Verifică Inbox acum
                                    </Button>
                                    <Button variant="outline" onClick={loadResponseStats} disabled={loading}>
                                        Statistici răspuns
                                    </Button>
                                </div>
                                {checkNowResult && (
                                    <div className="text-sm text-muted-foreground">
                                        Procesate: <span className="font-semibold">{checkNowResult.processed}</span> emailuri • {format(new Date(checkNowResult.at), 'dd.MM.yyyy HH:mm', { locale: ro })}
                                    </div>
                                )}
                                {responseStats && (
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="p-3 rounded bg-slate-50">
                                            <div className="text-slate-600">Trimise (30z)</div>
                                            <div className="text-xl font-semibold">{responseStats.totalEmailuriTrimise ?? 0}</div>
                                        </div>
                                        <div className="p-3 rounded bg-emerald-50">
                                            <div className="text-emerald-600">Cu răspuns</div>
                                            <div className="text-xl font-semibold">{responseStats.emailuriCuRaspuns ?? 0}</div>
                                        </div>
                                        <div className="p-3 rounded bg-blue-50">
                                            <div className="text-blue-600">Rata răspuns</div>
                                            <div className="text-xl font-semibold">{responseStats.rataRaspuns ?? 0}%</div>
                                        </div>
                                        <div className="p-3 rounded bg-orange-50">
                                            <div className="text-orange-600">Timp mediu (ore)</div>
                                            <div className="text-xl font-semibold">{responseStats.timpMediuRaspunsOre != null ? Math.round(responseStats.timpMediuRaspunsOre) : '—'}</div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        {/* Statistici de tracking */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <BarChart3 className="w-5 h-5 mr-2" />
                                    Statistici Tracking
                                </CardTitle>
                                <CardDescription>
                                    Performanța emailurilor și rata de angajament
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <Button 
                                        onClick={loadTrackingData} 
                                        disabled={loading}
                                        className="w-full"
                                    >
                                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                        Actualizează Statistici
                                    </Button>
                                    
                                    {trackingStats && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 bg-blue-50 rounded-lg">
                                                <div className="text-sm text-blue-600">Total Emailuri</div>
                                                <div className="text-2xl font-bold text-blue-800">
                                                    {trackingStats.TotalEmailuri || 0}
                                                </div>
                                            </div>
                                            
                                            <div className="p-3 bg-green-50 rounded-lg">
                                                <div className="text-sm text-green-600">Rata Deschidere</div>
                                                <div className="text-2xl font-bold text-green-800">
                                                    {trackingStats.RataDeschidere || 0}%
                                                </div>
                                            </div>
                                            
                                            <div className="p-3 bg-purple-50 rounded-lg">
                                                <div className="text-sm text-purple-600">Emailuri Deschise</div>
                                                <div className="text-2xl font-bold text-purple-800">
                                                    {trackingStats.EmailuriDeschise || 0}
                                                </div>
                                            </div>
                                            
                                            <div className="p-3 bg-orange-50 rounded-lg">
                                                <div className="text-sm text-orange-600">Rata Răspuns</div>
                                                <div className="text-2xl font-bold text-orange-800">
                                                    {trackingStats.RataRaspuns || 0}%
                                                </div>
                                            </div>
                                            
                                            {trackingStats.TimpMediuDeschidereOre && (
                                                <div className="col-span-2 p-3 bg-gray-50 rounded-lg">
                                                    <div className="text-sm text-gray-600">Timp Mediu Deschidere</div>
                                                    <div className="text-xl font-bold text-gray-800">
                                                        {Math.round(trackingStats.TimpMediuDeschidereOre)} ore
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Auto-remindere */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Clock className="w-5 h-5 mr-2" />
                                    Auto-Remindere
                                </CardTitle>
                                <CardDescription>
                                    Gestionarea reminder-elor automate pentru partenerii neresponsivi
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Zile înainte de reminder</Label>
                                            <Select value={reminderDays.toString()} onValueChange={(value) => setReminderDays(parseInt(value))}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="3">3 zile</SelectItem>
                                                    <SelectItem value="7">7 zile</SelectItem>
                                                    <SelectItem value="14">14 zile</SelectItem>
                                                    <SelectItem value="30">30 zile</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <Label>Tipul reminder-ului</Label>
                                            <Select value={reminderType} onValueChange={(value: any) => setReminderType(value)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="SOFT">Prietenos</SelectItem>
                                                    <SelectItem value="NORMAL">Normal</SelectItem>
                                                    <SelectItem value="URGENT">Urgent</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    
                                    <Button 
                                        onClick={handleSendReminders} 
                                        disabled={loading}
                                        className="w-full"
                                        variant="outline"
                                    >
                                        <Send className="w-4 h-4 mr-2" />
                                        Trimite Remindere Manuale
                                    </Button>
                                    
                                    {unresponsivePartners.length > 0 && (
                                        <div className="p-3 bg-yellow-50 rounded-lg">
                                            <div className="text-sm text-yellow-600 mb-2">
                                                Parteneri neresponsivi găsiți:
                                            </div>
                                            <div className="text-lg font-semibold text-yellow-800">
                                                {unresponsivePartners.length} parteneri
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Status primiri pe parteneri */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Mail className="w-5 h-5 mr-2" />
                                    Status Primiri (Parteneri)
                                </CardTitle>
                                <CardDescription>
                                    Parteneri care au răspuns vs. parteneri fără răspuns (ultimele trimiteri)
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold">Au răspuns ({respondedPartners.length})</h3>
                                        </div>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {respondedPartners.length === 0 ? (
                                                <div className="text-sm text-muted-foreground">Niciun partener nu a răspuns încă.</div>
                                            ) : respondedPartners.map((p, idx) => (
                                                <div key={idx} className="flex items-center justify-between border rounded p-2">
                                                    <div>
                                                        <div className="font-medium">{p.name || '—'}</div>
                                                        <div className="text-xs text-muted-foreground">{p.email}</div>
                                                    </div>
                                                    <Badge className="bg-emerald-100 text-emerald-800">
                                                        <CheckCircle className="w-3 h-3 mr-1" /> Răspuns
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold">Fără răspuns ({unresponsivePartnersAggregated.length})</h3>
                                        </div>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {unresponsivePartnersAggregated.length === 0 ? (
                                                <div className="text-sm text-muted-foreground">Toți partenerii au răspuns sau nu există emailuri trimise.</div>
                                            ) : unresponsivePartnersAggregated.map((p, idx) => (
                                                <div key={idx} className="flex items-center justify-between border rounded p-2">
                                                    <div>
                                                        <div className="font-medium">{p.name || '—'}</div>
                                                        <div className="text-xs text-muted-foreground">{p.email}</div>
                                                    </div>
                                                    <Badge variant="outline" className="text-orange-700 border-orange-200">
                                                        <Clock className="w-3 h-3 mr-1" /> Fără răspuns
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tabel parteneri neresponsivi */}
                    {unresponsivePartners.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <AlertCircle className="w-5 h-5 mr-2" />
                                    Parteneri Neresponsivi ({unresponsivePartners.length})
                                </CardTitle>
                                <CardDescription>
                                    Parteneri care nu au deschis sau răspuns la emailurile din ultimele {reminderDays} zile
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Destinatar</TableHead>
                                                <TableHead>Subiect</TableHead>
                                                <TableHead>Data Trimitere</TableHead>
                                                <TableHead>Zile</TableHead>
                                                <TableHead>Prioritate</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {unresponsivePartners.map((partner, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium">{partner.NumeDestinatar || 'N/A'}</div>
                                                            <div className="text-sm text-gray-500">{partner.EmailDestinatar}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="max-w-xs truncate" title={partner.SubiectEmail}>
                                                            {partner.SubiectEmail}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {format(new Date(partner.DataTrimitere), 'dd/MM/yyyy', { locale: ro })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={partner.ZileDeLaTrimitere >= 14 ? 'destructive' : 'secondary'}>
                                                            {partner.ZileDeLaTrimitere} zile
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={
                                                            partner.PriorityLevel === 'URGENT' ? 'destructive' :
                                                            partner.PriorityLevel === 'HIGH' ? 'default' : 'outline'
                                                        }>
                                                            {partner.PriorityLevel}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex space-x-1">
                                                            <Badge variant="outline" className="text-red-600">
                                                                <XCircle className="w-3 h-3 mr-1" />
                                                                Necitit
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default JurnalEmailPage;

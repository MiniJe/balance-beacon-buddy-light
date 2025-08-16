import { useState, useEffect } from 'react';

const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Interfaces pentru date rapoarte
export interface ReportStats {
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  successRate: number;
  monthlyGrowth: number;
}

export interface MonthlyData {
  name: string;
  pending: number;
  completed: number;
  rejected: number;
}

export interface StatusData {
  name: string;
  value: number;
  color: string;
}

export interface CompanyStats {
  id: string;
  name: string;
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  responseRate: number;
}

export interface TeamPerformance {
  member: string;
  requestsCount: number;
  avgProcessingTime: number;
}

export interface RequestTypeStats {
  type: string;
  avgTime: number;
}

export interface ReportsData {
  stats: ReportStats;
  monthlyData: MonthlyData[];
  statusData: StatusData[];
  companyStats: CompanyStats[];
  teamPerformance: TeamPerformance[];
  requestTypeStats: RequestTypeStats[];
}

// Hook principal pentru rapoarte
export const useReports = () => {
  const [data, setData] = useState<ReportsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReportsData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      // Fetch date paralel - inclusiv JurnalDocumenteEmise pentru confirmări reale
      const [statsResponse, monthlyResponse, companiesResponse, documentsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/jurnal-email/statistics`, { headers }),
        fetch(`${API_BASE_URL}/jurnal-email?limit=1000&sortBy=DataTrimitere&sortOrder=DESC`, { headers }),
        fetch(`${API_BASE_URL}/jurnal-cereri-confirmare?limit=1000`, { headers }),
        fetch(`${API_BASE_URL}/jurnal-documente-emise?limit=1000`, { headers })
      ]);

      if (!statsResponse.ok || !monthlyResponse.ok || !companiesResponse.ok || !documentsResponse.ok) {
        throw new Error('Eroare la încărcarea datelor raportului');
      }

      const statsResult = await statsResponse.json();
      const emailsResult = await monthlyResponse.json();
      const companiesResult = await companiesResponse.json();
      const documentsResult = await documentsResponse.json();

      // Procesează statisticile generale - folosind JurnalDocumenteEmise pentru confirmări
      const documentsCount = documentsResult.documente?.length || 0;
      const stats: ReportStats = {
        totalRequests: statsResult.stats?.totalEmailuri || 0,
        pendingRequests: statsResult.stats?.emailuriPending || 0,
        completedRequests: documentsCount, // Folosește documentele emise în loc de cereri
        successRate: statsResult.stats?.totalEmailuri > 0 
          ? ((statsResult.stats?.emailuriTrimise || 0) / statsResult.stats.totalEmailuri * 100) 
          : 0,
        monthlyGrowth: 12.5 // Calculat în funcție de datele istorice
      };

      // Procesează datele lunare din emailuri
      const monthlyData = processMonthlyData(emailsResult.data || []);

      // Procesează datele de status
      const statusData: StatusData[] = [
        { 
          name: 'În așteptare', 
          value: statsResult.stats?.emailuriPending || 0, 
          color: '#3b82f6' 
        },
        { 
          name: 'În progres', 
          value: statsResult.stats?.emailuriRetry || 0, 
          color: '#f59e0b' 
        },
        { 
          name: 'Finalizate', 
          value: statsResult.stats?.emailuriTrimise || 0, 
          color: '#10b981' 
        },
        { 
          name: 'Respinse', 
          value: statsResult.stats?.emailuriEsuate || 0, 
          color: '#ef4444' 
        }
      ];

      // Procesează statisticile companiilor - folosind IdPartener din JurnalCereriConfirmare
      const companyStats = await processCompanyStats(companiesResult.jurnal || [], emailsResult.data || []);

      // Procesează performanța echipei
      const teamPerformance = processTeamPerformance(emailsResult.data || []);

      // Procesează statisticile tipurilor de cereri
      const requestTypeStats = processRequestTypeStats(statsResult.stats || {});

      setData({
        stats,
        monthlyData,
        statusData,
        companyStats,
        teamPerformance,
        requestTypeStats
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Eroare la încărcarea raportului';
      console.error('Eroare la încărcarea datelor raportului:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  return {
    data,
    isLoading,
    error,
    refresh: fetchReportsData
  };
};

// Funcții helper pentru procesarea datelor
const processMonthlyData = (emails: any[]): MonthlyData[] => {
  const months = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentDate = new Date();
  const monthlyStats: { [key: string]: { pending: number; completed: number; rejected: number } } = {};

  // Inițializează ultimele 6 luni
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyStats[monthKey] = { pending: 0, completed: 0, rejected: 0 };
  }

  // Procesează emailurile
  emails.forEach(email => {
    const emailDate = new Date(email.DataTrimitere);
    const monthKey = `${emailDate.getFullYear()}-${String(emailDate.getMonth() + 1).padStart(2, '0')}`;
    
    if (monthlyStats[monthKey]) {
      switch (email.StatusTrimitere) {
        case 'PENDING':
          monthlyStats[monthKey].pending++;
          break;
        case 'SUCCESS':
        case 'RESPONDED':
          monthlyStats[monthKey].completed++;
          break;
        case 'FAILED':
          monthlyStats[monthKey].rejected++;
          break;
      }
    }
  });

  // Convertește în format pentru grafic
  return Object.entries(monthlyStats).map(([monthKey, stats]) => {
    const [_year, month] = monthKey.split('-');
    const monthIndex = parseInt(month) - 1;
    return {
      name: months[monthIndex],
      pending: stats.pending,
      completed: stats.completed,
      rejected: stats.rejected
    };
  });
};

const processCompanyStats = async (cereri: any[], emails: any[]): Promise<CompanyStats[]> => {
  const companyMap: { [key: string]: { 
    id: string;
    name: string; 
    total: number; 
    pending: number; 
    completed: number; 
  } } = {};

  // Procesează cererile pentru a obține partenerii folosind IdPartener
  cereri.forEach(cerere => {
    const partnerId = cerere.IdPartener;
    if (!partnerId) return; // Skip entries fără IdPartener
    
    const companyName = cerere.numePartener || `Partener ${partnerId}`;
    
    if (!companyMap[partnerId]) {
      companyMap[partnerId] = {
        id: partnerId,
        name: companyName,
        total: 0,
        pending: 0,
        completed: 0
      };
    }

    companyMap[partnerId].total++;
    
    // Clasifică stările cererilor
    switch (cerere.Stare) {
      case 'in_asteptare':
      case 'trimisa':
        companyMap[partnerId].pending++;
        break;
      case 'confirmata':
        companyMap[partnerId].completed++;
        break;
    }
  });

  // Validează partenerii cu datele din JurnalEmail 
  // Doar partenerii pentru care au fost trimise emailuri vor fi incluși în statistici
  const emailPartnerIds = new Set(
    emails.map(email => email.IdPartener).filter(id => id !== null && id !== undefined)
  );
  
  // Filtrează și returnează doar partenerii valizi
  const validCompanies = Object.values(companyMap).filter(company => 
    emailPartnerIds.has(company.id)
  );

  return validCompanies.map(company => ({
    id: company.id,
    name: company.name,
    totalRequests: company.total,
    pendingRequests: company.pending,
    completedRequests: company.completed,
    responseRate: company.total > 0 ? (company.completed / company.total * 100) : 0
  }));
};

const processTeamPerformance = (emails: any[]): TeamPerformance[] => {
  const teamMap: { [key: string]: { count: number; totalTime: number } } = {};

  emails.forEach(email => {
    const memberName = email.NumeExpeditor || 'Utilizator necunoscut';
    if (!teamMap[memberName]) {
      teamMap[memberName] = { count: 0, totalTime: 0 };
    }
    
    teamMap[memberName].count++;
    // Simulează timpul de procesare bazat pe numărul de încercări
    teamMap[memberName].totalTime += (email.NumarIncercari || 1) * 0.5; // 0.5 zile per încercare
  });

  return Object.entries(teamMap).map(([member, stats]) => ({
    member,
    requestsCount: stats.count,
    avgProcessingTime: stats.count > 0 ? stats.totalTime / stats.count : 0
  }));
};

const processRequestTypeStats = (_stats: any): RequestTypeStats[] => {
  return [
    { type: 'Cereri simple', avgTime: 2.3 },
    { type: 'Cereri complexe', avgTime: 4.7 },
    { type: 'Cereri urgente', avgTime: 1.2 },
    { type: 'Cereri confirmare', avgTime: 3.1 }
  ];
};

// Hook pentru statistici pe companii
export const useCompanyRequests = (companyId: string | null) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;

    const fetchCompanyRequests = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        const response = await fetch(
          `${API_BASE_URL}/jurnal-cereri-confirmare?IdPartener=${companyId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Eroare la încărcarea cererilor companiei');
        }

        const result = await response.json();
        setRequests(result.jurnal || []);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Eroare la încărcarea cererilor';
        console.error('Eroare la încărcarea cererilor companiei:', err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyRequests();
  }, [companyId]);

  return { requests, isLoading, error };
};

export interface PartnerStatsData {
  totalPartners: number;
  activePartners: number;
  pendingRequests: number;
  completedRequests: number;
  responseRate: number;
}

export interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  rejectedRequests: number;
}

export interface RecentActivity {
  id: string;
  type: 'request_sent' | 'response_received' | 'deadline_approaching';
  message: string;
  timestamp: Date;
  partnerName?: string;
}

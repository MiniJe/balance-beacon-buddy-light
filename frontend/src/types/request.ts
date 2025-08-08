
export interface ConfirmationRequest {
  id: string;
  partnerName: string;
  amount: number;
  currency: string;
  status: 'pending' | 'in-progress' | 'completed' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  dueDate: string;
  assignedTo?: string;
  notes?: string;
  sentDate?: string;
  responseDate?: string;
  responseType?: 'confirmed' | 'rejected' | 'partial';
}

export interface KanbanColumn {
  id: string;
  title: string;
  status: ConfirmationRequest['status'];
  requests: ConfirmationRequest[];
}

export interface Company {
  id: string;
  name: string;
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  responseRate: number;
}

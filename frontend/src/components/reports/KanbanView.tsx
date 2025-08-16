
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, DollarSign } from "lucide-react";
import { ConfirmationRequest, KanbanColumn } from "@/types/request";
// Ensure correct paths for ui components and utils
import { Badge } from "@/components/ui/badge"; 
import { getPriorityColor, getStatusColor } from "../../lib/reportUtils"; 

const mockRequests: ConfirmationRequest[] = [
  {
    id: '1',
    partnerName: 'ABC Company SRL',
    amount: 15000,
    currency: 'RON',
    status: 'pending',
    priority: 'high',
    createdAt: '2025-01-06',
    dueDate: '2025-01-10',
    assignedTo: 'Maria Popescu'
  },
  {
    id: '2',
    partnerName: 'XYZ Trading',
    amount: 8500,
    currency: 'EUR',
    status: 'in-progress',
    priority: 'medium',
    createdAt: '2025-01-05',
    dueDate: '2025-01-08',
    assignedTo: 'Ion Ionescu'
  },
  {
    id: '3',
    partnerName: 'Tech Solutions',
    amount: 25000,
    currency: 'RON',
    status: 'completed',
    priority: 'low',
    createdAt: '2025-01-03',
    dueDate: '2025-01-07',
    assignedTo: 'Ana Marinescu'
  }
];

const columns: KanbanColumn[] = [
  {
    id: 'pending',
    title: 'În așteptare',
    status: 'pending',
    requests: mockRequests.filter(r => r.status === 'pending')
  },
  {
    id: 'in-progress',
    title: 'În progres',
    status: 'in-progress',
    requests: mockRequests.filter(r => r.status === 'in-progress')
  },
  {
    id: 'completed',
    title: 'Finalizate',
    status: 'completed',
    requests: mockRequests.filter(r => r.status === 'completed')
  },
  {
    id: 'rejected',
    title: 'Respinse',
    status: 'rejected',
    requests: mockRequests.filter(r => r.status === 'rejected')
  }
];

export function KanbanView() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {columns.map((column) => (
        <div key={column.id} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">{column.title}</h3>
            <Badge variant="secondary">{column.requests.length}</Badge>
          </div>
          
          <div className="space-y-3">
            {column.requests.map((request) => (
              <Card 
                key={request.id} 
                className={`cursor-pointer hover:shadow-md transition-shadow ${getStatusColor(request.status)}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-medium">
                      {request.partnerName}
                    </CardTitle>
                    <Badge 
                      variant="outline" 
                      className={getPriorityColor(request.priority)}
                    >
                      {request.priority}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>{request.amount.toLocaleString()} {request.currency}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(request.dueDate).toLocaleDateString('ro-RO')}</span>
                  </div>
                  
                  {request.assignedTo && (
                    <div className="flex items-center gap-2 text-sm">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs">
                          {request.assignedTo.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">{request.assignedTo}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


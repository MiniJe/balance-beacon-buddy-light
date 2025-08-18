
import { useState } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { DollarSign, User } from "lucide-react";
import { ConfirmationRequest } from "@/types/request";
import { getStatusColor, getStatusLabel } from "../../lib/reportUtils";
// Ensure correct paths for ui components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; 
import { Badge } from "@/components/ui/badge"; 

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
  },
  {
    id: '4',
    partnerName: 'Digital Marketing Pro',
    amount: 12000,
    currency: 'RON',
    status: 'pending',
    priority: 'medium',
    createdAt: '2025-01-07',
    dueDate: '2025-01-12',
    assignedTo: 'Mihai Georgescu'
  }
];

export function CalendarView() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Get requests for selected date
  const getRequestsForDate = (date: Date | undefined) => {
    if (!date) return [];
    // Cheie de dată locală (YYYY-MM-DD) în timezone-ul utilizatorului
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    return mockRequests.filter(request => 
      request.dueDate === dateStr || request.createdAt === dateStr
    );
  };

  // Mark dates that have requests
  const getDatesWithRequests = () => {
    const dates = new Set<string>();
    mockRequests.forEach(request => {
      dates.add(request.dueDate);
      dates.add(request.createdAt);
    });
    return Array.from(dates).map(dateStr => new Date(dateStr));
  };

  const selectedDateRequests = getRequestsForDate(selectedDate);
  const datesWithRequests = getDatesWithRequests();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              modifiers={{
                hasRequests: datesWithRequests
              }}
              modifiersClassNames={{
                hasRequests: "bg-primary/20 text-primary font-medium"
              }}
            />
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>
              Cereri pentru {selectedDate?.toLocaleDateString('ro-RO')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nu există cereri pentru această dată
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDateRequests.map((request) => (
                  <Card key={request.id} className="border-l-4 border-l-primary/30">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium">{request.partnerName}</h4>
                        <Badge className={getStatusColor(request.status)}>
                          {getStatusLabel(request.status)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <span>{request.amount.toLocaleString()} {request.currency}</span>
                        </div>
                        
                        {request.assignedTo && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{request.assignedTo}</span>
                          </div>
                        )}
                        
                        <div>
                          <span className="font-medium">Creat: </span>
                          {new Date(request.createdAt).toLocaleDateString('ro-RO')}
                        </div>
                        
                        <div>
                          <span className="font-medium">Termen: </span>
                          {new Date(request.dueDate).toLocaleDateString('ro-RO')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


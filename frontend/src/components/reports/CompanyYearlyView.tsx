
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarDays, Filter, Download, Calendar, DollarSign, User, MessageSquare, CheckCircle, XCircle, Clock } from "lucide-react";
import { ConfirmationRequest } from "@/types/request";
// Ensure correct paths for ui components and utils
import { Badge } from "@/components/ui/badge"; 
import { getStatusIcon, getStatusLabel, getStatusColor, getPriorityColor } from "../../lib/reportUtils"; 

interface CompanyYearlyViewProps {
  companyName: string;
  requests: ConfirmationRequest[];
}

const months = [
  { value: '0', label: 'Ianuarie' },
  { value: '1', label: 'Februarie' },
  { value: '2', label: 'Martie' },
  { value: '3', label: 'Aprilie' },
  { value: '4', label: 'Mai' },
  { value: '5', label: 'Iunie' },
  { value: '6', label: 'Iulie' },
  { value: '7', label: 'August' },
  { value: '8', label: 'Septembrie' },
  { value: '9', label: 'Octombrie' },
  { value: '10', label: 'Noiembrie' },
  { value: '11', label: 'Decembrie' }
];

export function CompanyYearlyView({ companyName, requests }: CompanyYearlyViewProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  
  // Filtrează cererile pe an și lună
  const filteredRequests = requests.filter(request => {
    const requestDate = new Date(request.createdAt);
    const requestYear = requestDate.getFullYear();
    
    if (requestYear !== selectedYear) return false;
    
    if (selectedMonth !== 'all') {
      const requestMonth = requestDate.getMonth();
      return requestMonth === parseInt(selectedMonth);
    }
    
    return true;
  });

  // Calculează statistici pentru anul/luna selectată
  const totalRequests = filteredRequests.length;
  const completedRequests = filteredRequests.filter(r => r.status === 'completed').length;
  const pendingRequests = filteredRequests.filter(r => r.status === 'pending').length;
  const rejectedRequests = filteredRequests.filter(r => r.status === 'rejected').length;
  const totalAmount = filteredRequests.reduce((sum, r) => sum + r.amount, 0);
  const responseRate = totalRequests > 0 ? Math.round(((completedRequests + rejectedRequests) / totalRequests) * 100) : 0;

  // Grupează cererile pe luni pentru afișarea calendarului anual
  const requestsByMonth = months.map(month => {
    const monthRequests = requests.filter(request => {
      const requestDate = new Date(request.createdAt);
      return requestDate.getFullYear() === selectedYear && requestDate.getMonth() === parseInt(month.value);
    });
    
    return {
      ...month,
      requests: monthRequests,
      total: monthRequests.length,
      completed: monthRequests.filter(r => r.status === 'completed').length,
      pending: monthRequests.filter(r => r.status === 'pending').length
    };
  });

  const availableYears = Array.from(new Set(requests.map(r => new Date(r.createdAt).getFullYear()))).sort((a, b) => b - a);

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vizualizare anuală pentru {companyName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Nu există cereri pentru această companie
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtre și controale */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Vizualizare anuală pentru {companyName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Toate lunile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate lunile</SelectItem>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="sm" className="ml-auto">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistici pentru perioada selectată */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalRequests}</div>
            <p className="text-xs text-muted-foreground">Total cereri</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{completedRequests}</div>
            <p className="text-xs text-muted-foreground">Finalizate</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{pendingRequests}</div>
            <p className="text-xs text-muted-foreground">În așteptare</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{responseRate}%</div>
            <p className="text-xs text-muted-foreground">Rata răspuns</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Valoare totală</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar anual - prezentare pe luni */}
      {selectedMonth === 'all' && (
        <Card>
          <CardHeader>
            <CardTitle>Distribuția pe luni - {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {requestsByMonth.map((month) => (
                <Card key={month.value} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedMonth(month.value)}>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <h4 className="font-medium mb-2">{month.label}</h4>
                      <div className="text-2xl font-bold mb-2">{month.total}</div>
                      <div className="flex justify-center gap-2 text-sm">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {month.completed} finalizate
                        </Badge>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          {month.pending} așteptare
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista detaliată de cereri */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Lista cererilor {selectedMonth !== 'all' ? `- ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}` : `- ${selectedYear}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nu există cereri pentru perioada selectată
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Sumă</TableHead>
                  <TableHead>Prioritate</TableHead>
                  <TableHead>Data creării</TableHead>
                  <TableHead>Termen limită</TableHead>
                  <TableHead>Asignat</TableHead>
                  <TableHead>Data trimiterii</TableHead>
                  <TableHead>Data răspunsului</TableHead>
                  <TableHead>Tip răspuns</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(request.status)}
                        <Badge className={getStatusColor(request.status)}>
                          {getStatusLabel(request.status)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>{request.amount.toLocaleString()} {request.currency}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPriorityColor(request.priority)}>
                        {request.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(request.createdAt).toLocaleDateString('ro-RO')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(request.dueDate).toLocaleDateString('ro-RO')}
                    </TableCell>
                    <TableCell>
                      {request.assignedTo && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{request.assignedTo}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {request.sentDate ? new Date(request.sentDate).toLocaleDateString('ro-RO') : '-'}
                    </TableCell>
                    <TableCell>
                      {request.responseDate ? new Date(request.responseDate).toLocaleDateString('ro-RO') : '-'}
                    </TableCell>
                    <TableCell>
                      {request.responseType ? (
                        <Badge variant="outline" className={
                          request.responseType === 'confirmed' ? 'bg-green-100 text-green-800' :
                          request.responseType === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {request.responseType === 'confirmed' ? 'Confirmat' :
                           request.responseType === 'rejected' ? 'Respins' : 'Parțial'}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

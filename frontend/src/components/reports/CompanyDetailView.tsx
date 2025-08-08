import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, DollarSign, User, MessageSquare } from "lucide-react";
import { ConfirmationRequest } from "@/types/request";
// Ensure correct paths for ui components and utils
import { Badge } from "@/components/ui/badge"; 
import { getStatusIcon, getStatusLabel, getStatusColor, getPriorityColor } from "../../lib/reportUtils";

interface CompanyDetailViewProps {
  companyName: string;
  requests: ConfirmationRequest[];
}

export function CompanyDetailView({ companyName, requests }: CompanyDetailViewProps) {
  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cereri pentru {companyName}</CardTitle>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Istoric cereri pentru {companyName}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

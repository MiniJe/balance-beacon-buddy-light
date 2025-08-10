import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

interface Step2ConfigureProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  folderLocal: string;
  onFolderChange: (folder: string) => void;
  emailSubject: string;
  onEmailSubjectChange: (subject: string) => void;
  selectedPartnersCount: number;
  partnerCategory: string;
  processing: boolean;
  error: string | null;
  onBack: () => void;
  onNext: () => void;
}

export const Step2Configure = ({
  date,
  onDateChange,
  folderLocal,
  onFolderChange,
  emailSubject,
  onEmailSubjectChange,
  selectedPartnersCount,
  partnerCategory,
  processing,
  error,
  onBack,
  onNext
}: Step2ConfigureProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>2. Configurează Cererea</CardTitle>
        <CardDescription>
          Setează data pentru confirmare sold și configurează sesiunea.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Label>Data pentru confirmare sold</Label>
            <Calendar
              mode="single"
              selected={date}
              onSelect={onDateChange}
              className="border rounded-md"
              locale={ro}
            />
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder">Folder local pentru fișiere</Label>
              <Input 
                id="folder" 
                value={folderLocal}
                onChange={(e) => onFolderChange(e.target.value)}
                className="mt-1"
                placeholder="C:\CereriConfirmare"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Folderul unde vor fi salvate fișierele generate și încărcate cele semnate
              </p>
            </div>
            
            <div>
              <Label htmlFor="subject">Subiect email</Label>
              <Input 
                id="subject" 
                value={emailSubject}
                onChange={(e) => onEmailSubjectChange(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div className="space-y-2 border rounded-md p-4 bg-accent/50 mt-4">
              <h4 className="font-medium">Rezumat configurare</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Data confirmării: {date ? format(date, 'dd.MM.yyyy', { locale: ro }) : 'Neselectat'}</li>
                <li>• Parteneri selectați: {selectedPartnersCount}</li>
                <li>• Categorie: {partnerCategory === 'all' ? 'Toate categoriile' : partnerCategory ? partnerCategory.replace('_', ' ').toUpperCase() : 'Neselectat'}</li>
                <li>• Template: Selectare automată după categoria selectată</li>
                <li>• Folder local: {folderLocal}</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" onClick={onBack}>
          Înapoi
        </Button>
        <Button 
          onClick={onNext} 
          disabled={selectedPartnersCount === 0 || !date || !folderLocal || processing}
        >
          {processing ? 'Se inițializează...' : 'Inițializează Sesiunea'} <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

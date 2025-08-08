import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface DocumentGenerat {
  idDocument: string;
  numarInregistrare: number;
  idPartener: string;
  numePartener: string;
  tipPartener: string;
  numeDocument: string;
  caleFisier: string;
  hashDocument: string;
  dimensiuneDocument: number;
  status: "reserved" | "generated" | "downloaded" | "uploaded" | "signed";
  uploadedFile?: File;
}

interface SesiuneCereri {
  idSesiune: string;
  documenteReservate: DocumentGenerat[];
}

interface Step2GenerateDocumentsProps {
  currentSession: SesiuneCereri;
  processing: boolean;
  error: string | null;
  onBack: () => void;
  onGenerateDocuments: () => void;
  onResetToConfiguration: () => void;
}

export const Step2GenerateDocuments = ({
  currentSession,
  processing,
  error,
  onBack,
  onGenerateDocuments,
  onResetToConfiguration
}: Step2GenerateDocumentsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>2. Generează Documentele</CardTitle>
        <CardDescription>
          Generează documentele PDF din șabloanele Azure Blob Storage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <div className="border rounded-md p-4 bg-accent/50">
          <h4 className="font-medium mb-2">Sesiune inițializată cu succes!</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• ID Sesiune: {currentSession.idSesiune}</li>
            <li>• Numere rezervate: {currentSession.documenteReservate.length}</li>
            <li>• Interval numere: {Math.min(...currentSession.documenteReservate.map(d => d.numarInregistrare))} - {Math.max(...currentSession.documenteReservate.map(d => d.numarInregistrare))}</li>
          </ul>
          <div className="mt-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onResetToConfiguration}
              className="text-xs"
            >
              🔧 Înapoi la configurare (calendarul pentru data)
            </Button>
          </div>
        </div>
        
        <div className="space-y-3">
          {currentSession.documenteReservate.map((doc) => (
            <div key={doc.idDocument} className="flex items-center justify-between p-3 border rounded">
              <div>
                <p className="font-medium">{doc.numePartener}</p>
                <p className="text-sm text-muted-foreground">Nr. înregistrare: {doc.numarInregistrare}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                doc.tipPartener.includes("client") 
                  ? "bg-blue-100 text-blue-800" 
                  : "bg-green-100 text-green-800"
              }`}>
                {doc.tipPartener.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" onClick={onBack}>
          Înapoi
        </Button>
        <Button 
          onClick={onGenerateDocuments} 
          disabled={processing}
        >
          {processing ? 'Se generează...' : 'Generează PDF-urile'} <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

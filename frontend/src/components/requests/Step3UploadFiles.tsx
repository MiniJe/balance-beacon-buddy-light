import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ChevronRight, FileUp, FileText, Users } from "lucide-react";

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

interface Step3UploadFilesProps {
  documentsGenerated: DocumentGenerat[];
  folderLocal: string;
  error: string | null;
  onUploadFile: (documentId: string, file: File) => void;
  onUploadBulkFiles: (files: File[]) => void;
  onBack: () => void;
  onNext: () => void;
  allDocumentsUploaded: boolean;
}

export const Step3UploadFiles = ({
  documentsGenerated,
  folderLocal,
  error,
  onUploadFile,
  onUploadBulkFiles,
  onBack,
  onNext,
  allDocumentsUploaded
}: Step3UploadFilesProps) => {
  const handleFileUpload = (documentId: string) => {
    const input = window.document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        onUploadFile(documentId, target.files[0]);
      }
    };
    input.click();
  };

  const handleBulkFileUpload = () => {
    const input = window.document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.multiple = true;
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        onUploadBulkFiles(Array.from(target.files));
      }
    };
    input.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>3. Semnează și Încarcă Fișierele</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <div className="border rounded-md p-4 bg-accent/50 mb-4">
          <p className="text-sm flex items-center font-medium">
            <FileText className="h-4 w-4 mr-2" />
            Documentele au fost generate în folderul: <code className="ml-1 bg-background px-1 rounded">{folderLocal}</code>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Semnează fișierele electronic și încarcă-le în aplicație pentru a continua.
          </p>
        </div>

        <div className="flex justify-center mb-4">
          <Button
            variant="default"
            onClick={handleBulkFileUpload}
            className="flex items-center space-x-2"
          >
            <FileUp className="h-4 w-4" />
            <span>Încarcă Fișiere Semnate (Bulk)</span>
          </Button>
        </div>
        
        <div className="max-h-[400px] overflow-y-auto space-y-3">
          {documentsGenerated.map((document) => (
            <div key={document.idDocument} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded hover:bg-accent">
              <div className="flex items-center space-x-4 mb-2 md:mb-0">
                <div className={`p-2 rounded relative ${
                  document.tipPartener.includes("client") ? "bg-blue-100" : "bg-green-100"
                }`}>
                  <Users className={`h-5 w-5 ${
                    document.tipPartener.includes("client") ? "text-blue-700" : "text-green-700"
                  }`} />
                  {document.status === "uploaded" && (
                    <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-medium">{document.numePartener}</h4>
                  <p className="text-sm text-muted-foreground">{document.numeDocument}</p>
                  <p className="text-xs text-muted-foreground">Nr. înregistrare: {document.numarInregistrare}</p>
                  {document.status === "uploaded" && document.uploadedFile && (
                    <p className="text-xs text-green-600 font-medium">
                      📄 {document.uploadedFile.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Button
                    variant={document.status === "uploaded" ? "default" : "outline"}
                    size="sm"
                    className="flex items-center space-x-1"
                    onClick={() => {
                      if (document.status === "uploaded") return;
                      handleFileUpload(document.idDocument);
                    }}
                    disabled={document.status === "uploaded"}
                  >
                    {document.status === "uploaded" ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Încărcat</span>
                      </>
                    ) : (
                      <>
                        <FileUp className="h-4 w-4" />
                        <span>Încarcă Semnat</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" onClick={onBack}>
          Înapoi
        </Button>
        <Button 
          onClick={onNext} 
          disabled={!allDocumentsUploaded}
        >
          Continuă <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

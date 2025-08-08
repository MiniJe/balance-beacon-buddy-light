
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Template } from "@/types/template";
// Ensure correct paths for ui components
import { Label } from "@/components/ui/label"; 
import { Input } from "@/components/ui/input"; 
import { Textarea } from "@/components/ui/textarea"; 
import { Button } from "@/components/ui/button"; 

interface TemplateEditorProps {
  template: Template;
  onSave: () => void;
  onChange: (updatedTemplate: Template) => void;
  saving?: boolean;
}

export const TemplateEditor = ({ template, onSave, onChange, saving = false }: TemplateEditorProps) => {
  const [previewMode, setPreviewMode] = useState(false);

  const renderPreview = () => {
    if (!template) return null;
    
    // Replace variables with example values for preview
    let previewContent = template.content
      .replace(/\[NUME_PARTENER\]/g, "Exemplu SRL")
      .replace(/\[CUI_PARTENER\]/g, "RO12345678")
      .replace(/\[DATA\]/g, "31.05.2025")
      .replace(/\[NUME_COMPANIE\]/g, "Compania Mea SRL")
      .replace(/\[DATA_TRIMITERE\]/g, "15.05.2025")
      .replace(/\[PERIOADA\]/g, "Decembrie 2024")
      .replace(/\[OBSERVATII\]/g, "Fără observații")
      .replace(/\[ADRESA_PARTENER\]/g, "Str. Exemplu Nr. 123, București")
      .replace(/\[TELEFON_PARTENER\]/g, "0721-123-456")
      .replace(/\[EMAIL_PARTENER\]/g, "contact@exemplu.ro")
      .replace(/\[NUMĂR_ORDINE\]/g, "2025001")
      .replace(/\[REPREZENTANT_PARTENER\]/g, "Popescu Ion");
    
    if (template.type === "email") {
      // For email templates, preserve line breaks
      return (
        <div className="border rounded-md p-4 bg-white min-h-[300px]">
          {previewContent.split('\n').map((line, i) => (
            <span key={i}>
              {line}
              <br />
            </span>
          ))}
        </div>
      );
    } else {
      // For PDF templates, render as HTML
      return (
        <div 
          className="border rounded-md p-4 bg-white min-h-[300px]"
          dangerouslySetInnerHTML={{ __html: previewContent }}
        />
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{template.name}</CardTitle>
            <CardDescription>
              {template.type === "email" ? "Șablon pentru corpul emailului" : "Șablon pentru documentul PDF atașat"}
            </CardDescription>
          </div>
          <Tabs value={previewMode ? "preview" : "edit"} onValueChange={(v) => setPreviewMode(v === "preview")}>
            <TabsList>
              <TabsTrigger value="edit">Editare</TabsTrigger>
              <TabsTrigger value="preview">Previzualizare</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {previewMode ? (
          renderPreview()
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nume șablon</Label>
              <Input 
                id="template-name" 
                value={template.name}
                onChange={(e) => onChange({...template, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-type">Tip șablon</Label>
                <select 
                  id="template-type"
                  className="w-full p-2 border rounded-md"
                  value={template.type}
                  onChange={(e) => onChange({
                    ...template, 
                    type: e.target.value as "email" | "pdf"
                  })}
                >
                  <option value="email">Email</option>
                  <option value="pdf">Document PDF</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-category">Categorie</Label>
                <select 
                  id="template-category"
                  className="w-full p-2 border rounded-md"
                  value={template.category || "general"}
                  onChange={(e) => onChange({
                    ...template, 
                    category: e.target.value as "client" | "furnizor" | "general" | "fise"
                  })}
                >
                  <option value="general">General</option>
                  <option value="client">Client</option>
                  <option value="furnizor">Furnizor</option>
                  <option value="fise">Fișe</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-content">Conținut</Label>
              <Textarea 
                id="template-content" 
                value={template.content}
                onChange={(e) => onChange({...template, content: e.target.value})}
                className="min-h-[300px]"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setPreviewMode(true)}>
                Previzualizare
              </Button>
              <Button onClick={onSave} disabled={saving}>
                {saving ? "Se salvează..." : "Salvează"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

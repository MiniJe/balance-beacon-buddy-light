
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TemplateList } from "@/components/templates/TemplateList";
import { TemplateVariables } from "@/components/templates/TemplateVariables";
import { TemplateEditor } from "@/components/templates/TemplateEditor";
import { EmptyTemplateState } from "@/components/templates/EmptyTemplateState";
import { templateService, EmailTemplate, TemplateVariable } from "@/services/template.service";
import { Template } from "@/types/template";
import { useToast } from "@/hooks/use-toast";

const Templates = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<EmailTemplate | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Încarcă datele la montare
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesData, variablesData] = await Promise.all([
        templateService.getAllTemplates(),
        templateService.getTemplateVariables()
      ]);
      
      setTemplates(templatesData);
      setVariables(variablesData);
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message || "Eroare la încărcarea datelor",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: EmailTemplate) => {
    setActiveTemplate({...template});
  };

  const handleSaveTemplate = async () => {
    if (!activeTemplate) return;
    
    try {
      setSaving(true);
      
      if (activeTemplate.IdSablon && templates.find(t => t.IdSablon === activeTemplate.IdSablon)) {
        // Actualizează șablonul existent
        await templateService.updateTemplate(activeTemplate.IdSablon, {
          NumeSablon: activeTemplate.NumeSablon,
          ContinutSablon: activeTemplate.ContinutSablon,
          TipSablon: activeTemplate.TipSablon,
          CategorieSablon: activeTemplate.CategorieSablon
        });
        
        // Actualizează lista locală
        setTemplates(templates.map(t => 
          t.IdSablon === activeTemplate.IdSablon ? activeTemplate : t
        ));
      } else {
        // Creează șablon nou
        const idSablon = await templateService.createTemplate({
          NumeSablon: activeTemplate.NumeSablon,
          ContinutSablon: activeTemplate.ContinutSablon,
          TipSablon: activeTemplate.TipSablon,
          CategorieSablon: activeTemplate.CategorieSablon
        });
        
        // Adaugă în lista locală
        const newTemplate = { ...activeTemplate, IdSablon: idSablon };
        setTemplates([...templates, newTemplate]);
        setActiveTemplate(newTemplate);
      }
      
      toast({
        title: "Succes",
        description: "Șablonul a fost salvat cu succes!"
      });
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message || "Eroare la salvarea șablonului",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInsertVariable = (variable: string) => {
    if (activeTemplate) {
      const textarea = document.getElementById("template-content") as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const content = activeTemplate.ContinutSablon;
        const newContent = content.substring(0, start) + variable + content.substring(end);
        
        setActiveTemplate({...activeTemplate, ContinutSablon: newContent});
        
        // Set focus back and position cursor after the inserted variable
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
      }
    }
  };

  const handleCreateTemplate = () => {
    const newTemplate: EmailTemplate = {
      IdSablon: '', // Se va seta la salvare
      NumeSablon: "Șablon nou",
      ContinutSablon: "",
      TipSablon: "email",
      CategorieSablon: "general",
      Activ: true,
      CreatLa: new Date().toISOString(),
      CreatDe: "USER"
    };
    setActiveTemplate(newTemplate);
  };

  const handleDeleteTemplate = async (idSablon: string) => {
    try {
      await templateService.deleteTemplate(idSablon);
      
      // Elimină din lista locală
      setTemplates(templates.filter(t => t.IdSablon !== idSablon));
      
      // Dacă șablonul șters era cel activ, dezactivează-l
      if (activeTemplate?.IdSablon === idSablon) {
        setActiveTemplate(null);
      }
      
      toast({
        title: "Succes",
        description: "Șablonul a fost șters cu succes!"
      });
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message || "Eroare la ștergerea șablonului",
        variant: "destructive"
      });
    }
  };

  // Convertește variabilele pentru componenta TemplateVariables
  const formattedVariables = variables.map((v, index) => ({
    id: index + 1,
    name: v.NumeVariabila,
    description: v.DescriereVariabila
  }));

  // Convertește șabloanele pentru componenta TemplateList
  const formattedTemplates: Template[] = templates.map((t, index) => ({
    id: index + 1,
    name: t.NumeSablon,
    content: t.ContinutSablon,
    type: t.TipSablon,
    category: t.CategorieSablon === 'reminder' ? 'general' : t.CategorieSablon as ('client' | 'furnizor' | 'general' | 'fise')
  }));

  const handleFormattedSelectTemplate = (template: Template) => {
    const realTemplate = templates.find((_t, index) => index + 1 === template.id);
    if (realTemplate) {
      handleSelectTemplate(realTemplate);
    }
  };

  const handleFormattedDeleteTemplate = async (templateId: number) => {
    const realTemplate = templates.find((_t, index) => index + 1 === templateId);
    if (realTemplate && realTemplate.IdSablon) {
      await handleDeleteTemplate(realTemplate.IdSablon);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Se încarcă șabloanele...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Șabloane</h1>
        <Button onClick={handleCreateTemplate}>
          Adaugă Șablon
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <TemplateList
            templates={formattedTemplates}
            activeTemplate={activeTemplate ? {
              id: 0,
              name: activeTemplate.NumeSablon,
              content: activeTemplate.ContinutSablon,
              type: activeTemplate.TipSablon,
              category: activeTemplate.CategorieSablon === 'reminder' ? 'general' : activeTemplate.CategorieSablon as ('client' | 'furnizor' | 'general' | 'fise')
            } : null}
            filterCategory={filterCategory}
            onSelectTemplate={handleFormattedSelectTemplate}
            onFilterChange={setFilterCategory}
            onDeleteTemplate={handleFormattedDeleteTemplate}
          />
          
          <TemplateVariables
            variables={formattedVariables}
            onInsertVariable={handleInsertVariable}
            disabled={!activeTemplate}
          />
        </div>
        
        <div className="md:col-span-3">
          {activeTemplate ? (
            <TemplateEditor 
              template={{
                id: 0,
                name: activeTemplate.NumeSablon,
                content: activeTemplate.ContinutSablon,
                type: activeTemplate.TipSablon,
                category: activeTemplate.CategorieSablon === 'reminder' ? 'general' : activeTemplate.CategorieSablon as ('client' | 'furnizor' | 'general' | 'fise')
              }}
              onSave={handleSaveTemplate}
              onChange={(updatedTemplate) => {
                if (activeTemplate) {
                  setActiveTemplate({
                    ...activeTemplate,
                    NumeSablon: updatedTemplate.name,
                    ContinutSablon: updatedTemplate.content,
                    TipSablon: updatedTemplate.type,
                    CategorieSablon: updatedTemplate.category || 'general'
                  });
                }
              }}
              saving={saving}
            />
          ) : (
            <EmptyTemplateState />
          )}
        </div>
      </div>
    </div>
  );
};

export default Templates;

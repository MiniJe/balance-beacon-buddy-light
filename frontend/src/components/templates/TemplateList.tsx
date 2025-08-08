
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Template } from "@/types/template";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface TemplateListProps {
  templates: Template[];
  activeTemplate: Template | null;
  filterCategory: string;
  onSelectTemplate: (template: Template) => void;
  onFilterChange: (category: string) => void;
  onDeleteTemplate?: (templateId: number) => void;
}

export const TemplateList = ({ 
  templates, 
  activeTemplate, 
  filterCategory,
  onSelectTemplate,
  onFilterChange,
  onDeleteTemplate
}: TemplateListProps) => {
  const filteredTemplates = templates.filter(template => 
    filterCategory === "all" || template.category === filterCategory || !template.category
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Șabloane disponibile</CardTitle>
        <CardDescription>
          Selectează un șablon pentru editare
        </CardDescription>
        <div className="pt-2">
          <Tabs value={filterCategory} onValueChange={onFilterChange}>
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">Toate</TabsTrigger>
              <TabsTrigger value="client" className="flex-1">Client</TabsTrigger>
              <TabsTrigger value="furnizor" className="flex-1">Furnizor</TabsTrigger>
              <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
              <TabsTrigger value="fise" className="flex-1">Fișe</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {filteredTemplates.map(template => (
            <div key={template.id} className="flex items-center gap-2 group">
              <Button 
                variant={activeTemplate?.id === template.id ? "default" : "outline"}
                className="flex-1 justify-start"
                onClick={() => onSelectTemplate(template)}
              >
                <div className="flex flex-col items-start">
                  <span>{template.name}</span>
                  <div className="flex space-x-2 text-xs text-muted-foreground">
                    <span>{template.type === "email" ? "Email" : "Document PDF"}</span>
                    {template.category && (
                      <span className={`px-1.5 py-0.5 rounded ${
                        template.category === "client" 
                          ? "bg-blue-100 text-blue-800" 
                          : template.category === "furnizor"
                            ? "bg-green-100 text-green-800"
                            : template.category === "fise"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-800"
                      }`}>
                        {template.category === "client" 
                          ? "Client" 
                          : template.category === "furnizor"
                            ? "Furnizor"
                            : template.category === "fise"
                              ? "Fișe"
                              : "General"
                        }
                      </span>
                    )}
                  </div>
                </div>
              </Button>
              {onDeleteTemplate && (
                <Button
                  variant="outline"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTemplate(template.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};


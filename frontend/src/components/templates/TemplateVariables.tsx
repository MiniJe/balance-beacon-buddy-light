
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Ensure correct path for types
import { TemplateVariable } from "@/types/template";

interface TemplateVariablesProps {
  variables: TemplateVariable[];
  onInsertVariable: (variable: string) => void;
  disabled: boolean;
}

export const TemplateVariables = ({ variables, onInsertVariable, disabled }: TemplateVariablesProps) => {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Variabile disponibile</CardTitle>
        <CardDescription>
          Inserează variabile în șablon
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {variables.map(variable => (
            <Button 
              key={variable.id}
              variant="outline" 
              size="sm"
              className="mr-2 mb-2 text-xs"
              onClick={() => onInsertVariable(variable.name)}
              disabled={disabled}
            >
              {variable.name}
            </Button>
          ))}
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          Click pe o variabilă pentru a o insera în poziția cursorului din șablon.
        </div>
      </CardContent>
    </Card>
  );
};

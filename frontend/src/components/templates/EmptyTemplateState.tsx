
import { Card, CardContent } from "@/components/ui/card";

// Ensure correct path for ui components
export const EmptyTemplateState = () => {
  return (
    <Card>
      <CardContent className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Selectează un șablon pentru a-l edita</p>
      </CardContent>
    </Card>
  );
};

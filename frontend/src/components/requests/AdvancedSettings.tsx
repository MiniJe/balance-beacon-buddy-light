import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export const AdvancedSettings = () => {
  const navigate = useNavigate();

  const handleNavigateToSettings = () => {
    navigate('/settings?tab=advanced');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Setări Avansate - Relocate</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertDescription>
            Setările avansate au fost mutate în pagina principală de setări pentru o gestionare mai bună. 
            Acolo vei găsi toate opțiunile pentru remindere automate, tracking și configurări globale.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={handleNavigateToSettings} className="w-full">
            Deschide Setările Avansate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

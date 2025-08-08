
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
// Ensure correct path for ui components
import { Button } from "@/components/ui/button"; 

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md mx-auto p-6">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <p className="text-xl text-foreground mb-4">Pagina nu a fost găsită</p>
        <p className="text-muted-foreground">
          Ne pare rău, dar pagina pe care încerci să o accesezi nu există sau a fost mutată.
        </p>
        <Button asChild className="mt-4">
          <Link to="/">Înapoi la Dashboard</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;

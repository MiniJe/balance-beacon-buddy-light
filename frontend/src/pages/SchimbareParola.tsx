import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, KeyRound, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
// Toast removed to eliminate warnings
import { useAuth } from '@/contexts/AuthContext';

const SchimbareParola = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    IdContabil: '',
    ParolaVeche: '',
    ParolaNoua: '',
    ConfirmareParola: ''
  });
  useEffect(() => {
    // Verifică dacă utilizatorul este autentificat și trebuie să-și schimbe parola
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Debugging pentru a vedea informațiile utilizatorului
    console.log('User object from auth context:', user);
    const rawToken = localStorage.getItem('token');
    console.log('Raw token from localStorage:', !!rawToken);
    try {
      // Parsarea token-ului JWT pentru a vedea ce conține
      if (rawToken) {
        const base64Url = rawToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        console.log('Decoded token payload:', JSON.parse(jsonPayload));
      }
    } catch (e) {
      console.error('Error decoding token:', e);
    }

    // Verifică dacă utilizatorul este contabil și trebuie să-și schimbe parola
    if (user?.TipUtilizator !== 'CONTABIL' || !user.SchimbareParolaLaLogare) {
      navigate('/');
      return;
    }// Populează ID-ul contabilului
    setFormData(prev => ({
      ...prev,
      IdContabil: user.IdContabil || ''
    }));
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validare
    if (formData.ParolaNoua !== formData.ConfirmareParola) {
      setError('Parolele nu coincid');
      setIsLoading(false);
      return;
    }

    if (formData.ParolaNoua.length < 8) {
      setError('Parola trebuie să aibă minim 8 caractere');
      setIsLoading(false);
      return;
    }    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Utilizator neautentificat');
      }
      
      // Convert to string to ensure type consistency
      const idContabil = formData.IdContabil.toString();
      console.log('Sending password change request for ID:', idContabil);
      
      const response = await fetch('/api/contabili/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          IdContabil: idContabil,
          ParolaVeche: formData.ParolaVeche,
          ParolaNoua: formData.ParolaNoua
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Eroare la schimbarea parolei');
      }

      console.log('Parola a fost schimbată cu succes');
      
      // Deconectare și redirect către pagina de login pentru reautentificare
      logout();
      navigate('/login');
    } catch (err: any) {
      const errorMessage = err.message || 'Eroare la schimbarea parolei';
      console.error('Schimbare parolă error:', err);
      setError(errorMessage);
      console.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Schimbare Parolă</CardTitle>
          <CardDescription>
            Schimbă parola pentru prima conectare
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ParolaVeche">Parola actuală</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input
                  id="ParolaVeche"
                  name="ParolaVeche"
                  type="password"
                  placeholder="Introdu parola actuală"
                  className="pl-10"
                  value={formData.ParolaVeche}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ParolaNoua">Parola nouă</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input
                  id="ParolaNoua"
                  name="ParolaNoua"
                  type="password"
                  placeholder="Introdu parola nouă"
                  className="pl-10"
                  value={formData.ParolaNoua}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ConfirmareParola">Confirmă parola</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input
                  id="ConfirmareParola"
                  name="ConfirmareParola"
                  type="password"
                  placeholder="Confirmă parola nouă"
                  className="pl-10"
                  value={formData.ConfirmareParola}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>Procesare...</>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvează parola nouă
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SchimbareParola;

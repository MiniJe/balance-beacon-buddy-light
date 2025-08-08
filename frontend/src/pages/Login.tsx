import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
// Toast removed to eliminate warnings
import { useAuth } from '@/contexts/AuthContext';
import { getUserName } from '@/utils/user.utils';

const Login = () => {
  const navigate = useNavigate();
  const { login, needsPasswordChange } = useAuth();  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Utilizăm serviciul unificat de autentificare
      const user = await login(email, password);
      
      // Afișăm mesaj de bun venit personalizat în funcție de tipul utilizatorului
      console.log(`Bun venit, ${getUserName(user)}!`);
      
      // Verifică dacă contabilul trebuie să-și schimbe parola la prima logare
      if (needsPasswordChange()) {
        console.info('Trebuie să îți schimbi parola la prima conectare');
        navigate('/schimbare-parola');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Credențiale incorecte';
      console.error('Login error:', err);
      setError(errorMessage);
      console.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <LogIn className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Balance Beacon Buddy</CardTitle>
          <CardDescription>
            Intră în cont pentru a accesa aplicația
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
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@exemplu.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Parolă</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>Procesare...</>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Autentificare
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;


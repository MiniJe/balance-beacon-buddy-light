import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authUnifiedService, { UnifiedUser } from '@/services/auth.unified.service';
import { sesiuniService } from '../services/sesiuni.service';

interface AuthContextType {
  user: UnifiedUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  currentSession: string | null;
  login: (email: string, password: string) => Promise<UnifiedUser>;
  logout: () => void;
  isMaster: () => boolean;
  isContabil: () => boolean;
  needsPasswordChange: () => boolean;
  getPermisiuni: () => any | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UnifiedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  useEffect(() => {
    // Verifică dacă utilizatorul este autentificat la încărcarea aplicației
    const initialize = () => {
      try {
        const token = authUnifiedService.getToken();
        const savedUser = authUnifiedService.getCurrentUser();
        const savedSessionId = localStorage.getItem('sessionId');
        
        console.log('AuthProvider - Token exists:', !!token);
        console.log('AuthProvider - Saved user exists:', !!savedUser);
        console.log('AuthProvider - Saved session exists:', !!savedSessionId);
        
        if (token && savedUser) {
          setUser(savedUser);
          setCurrentSession(savedSessionId);
        }
        
        // Inițializează serviciul de sesiuni
        sesiuniService.initialize();
      } catch (error) {
        console.error('Error initializing auth context:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initialize();
  }, []);
  const login = async (email: string, password: string): Promise<UnifiedUser> => {
    console.log('AuthProvider - Login called with email:', email);
    
    try {
      // Utilizăm serviciul unificat pentru autentificare
      const response = await authUnifiedService.login({ email, password });
      
      setUser(response.user);
      setCurrentSession(response.sessionId);
      
      console.log('✅ Autentificare reușită:', response.user.TipUtilizator);
      return response.user;
    } catch (error) {
      console.error('Eroare la autentificare:', error);
      throw error;
    }
  };
  const logout = async () => {
    console.log('AuthProvider - Logout called');
    
    // Închide sesiunea în jurnal
    try {
      await sesiuniService.closeSesiune('Logout utilizator');
      console.log('✅ Sesiune închisă în jurnal');
    } catch (error) {
      console.error('Eroare la închiderea sesiunii în jurnal:', error);
    }
    
    authUnifiedService.logout();
    setUser(null);
    setCurrentSession(null);
  };

  const isMaster = () => authUnifiedService.isMaster();
  const isContabil = () => authUnifiedService.isContabil();
  const needsPasswordChange = () => authUnifiedService.needsPasswordChange();
  const getPermisiuni = () => authUnifiedService.getPermisiuni();
  
  const isAuthenticated = !!user && !!authUnifiedService.getToken();
  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      currentSession,
      login,
      logout,
      isMaster,
      isContabil,
      needsPasswordChange,
      getPermisiuni
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

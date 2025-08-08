
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from './Navbar';
// Removed toast system to eliminate warnings 
import { useAuth } from '@/contexts/AuthContext';
import { authUnifiedService } from '@/services/auth.unified.service';
import { SessionInfo } from '@/components/common/SessionInfo';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  useEffect(() => {
    console.log('DashboardLayout - isAuthenticated:', isAuthenticated);
    console.log('DashboardLayout - isLoading:', isLoading);
    
    if (!isLoading && !isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      navigate('/login');
      return;
    }
    
    // Verifică dacă utilizatorul trebuie să-și schimbe parola
    if (!isLoading && isAuthenticated && authUnifiedService.needsPasswordChange()) {
      console.log('User needs to change password, redirecting');
      navigate('/schimbare-parola');
    }
  }, [navigate, isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Se încarcă...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen">
      <Navbar />
      <main className="flex-1 overflow-auto scrollbar-hide">
        {/* Header cu informații sesiune */}
        <div className="bg-white border-b px-6 py-3">
          <SessionInfo className="justify-end" />
        </div>
        
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
      {/* Toaster removed to eliminate warnings */}
    </div>
  );
}

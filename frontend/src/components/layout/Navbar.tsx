import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";
// Ensure correct path for ui components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
// Toast removed to eliminate warnings
import { LayoutDashboard, Users, FileText, Settings, Mail, LogOut, KanbanSquare, MailOpen, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/"
  },
  {
    title: "Parteneri",
    icon: Users,
    href: "/parteneri"
  },
  {
    title: "Șabloane",
    icon: FileText,
    href: "/sabloane"
  },
  {
    title: "Rapoarte",
    icon: KanbanSquare,
    href: "/rapoarte"
  },
  {
    title: "Jurnal Email",
    icon: MailOpen,
    href: "/jurnal-email"
  },
  {
    title: "Email",
    icon: Mail,
    href: "/email"
  },
  {
    title: "Setări",
    icon: Settings,
    href: "/setari"
  }
];

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [about, setAbout] = useState<{ loading: boolean; data?: any; error?: string }>({ loading: false });

  const openAbout = async () => {
    setAboutOpen(true);
    setAbout({ loading: true });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/update/version', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const json = await res.json();
      setAbout({ loading: false, data: json?.data || json });
    } catch (e:any) {
      setAbout({ loading: false, error: e?.message || 'Nu s-au putut obține detaliile' });
    }
  };

  const handleLogout = () => {
    logout();
    console.log('Te-ai deconectat cu succes');
    navigate('/login');
  };
  
  return (
    <aside className="flex flex-col h-screen bg-sidebar border-r w-64 shrink-0">
      <div className="p-6">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-primary">
          <Mail className="h-6 w-6" />
          <span>FRESHCRM</span>
        </h2>
      </div>
      
      <nav className="mt-2 flex-1">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            return (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      (isActive || (item.href !== "/" && location.pathname.startsWith(item.href))) 
                        ? "bg-accent text-accent-foreground" 
                        : "text-sidebar-foreground hover:bg-accent/60 hover:text-accent-foreground"
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="border-t p-4 space-y-3">
        <Button 
          variant="outline" 
          className="w-full justify-start" 
          onClick={openAbout}
        >
          <Info className="mr-2 h-4 w-4" />
          Despre
        </Button>
        <Button 
          variant="outline" 
          className="w-full justify-start" 
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Ieși din cont
        </Button>
        <div className="text-xs text-muted-foreground">
          <p>© 2025 FRESHCRM BBB - Lite</p>
        </div>
      </div>

      {aboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAboutOpen(false)} />
          <div className="relative z-10 w-[90%] max-w-md">
            <Card>
              <CardHeader>
                <CardTitle>Despre aplicație</CardTitle>
                <CardDescription>Balance Beacon Buddy — Lite</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {about.loading ? (
                  <p>Se încarcă...</p>
                ) : about.error ? (
                  <p className="text-red-600">{about.error}</p>
                ) : (
                  <div className="space-y-1">
                    <div className="flex justify-between"><span>Versiune backend</span><span className="font-mono">{about.data?.backendVersion || '—'}</span></div>
                    {about.data?.git && (
                      <div className="flex justify-between"><span>Git</span><span className="font-mono">{about.data.git.branch}@{String(about.data.git.commit || '').slice(0,7)}</span></div>
                    )}
                    <div className="flex justify-between"><span>Self update</span><span>{about.data?.selfUpdateEnabled ? 'ON' : 'OFF'}</span></div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="justify-end gap-2">
                <Button variant="outline" onClick={() => setAboutOpen(false)}>Închide</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </aside>
  );
}

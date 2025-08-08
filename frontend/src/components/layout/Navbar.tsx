import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";
// Ensure correct path for ui components
import { Button } from "@/components/ui/button";
// Toast removed to eliminate warnings
import { LayoutDashboard, Users, FileText, Settings, Mail, LogOut, KanbanSquare, MailOpen } from 'lucide-react';
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
    title: "Setări",
    icon: Settings,
    href: "/setari"
  }
];

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

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
          <span>Confirmări Sold</span>
        </h2>
      </div>
      
      <nav className="mt-2 flex-1">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== "/" && location.pathname.startsWith(item.href));
              
            return (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive 
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
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Ieși din cont
        </Button>
        <div className="text-xs text-muted-foreground">
          <p>© 2025 Confirmări Sold</p>
        </div>
      </div>
    </aside>
  );
}

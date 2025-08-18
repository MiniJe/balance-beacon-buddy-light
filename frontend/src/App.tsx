import { TooltipProvider } from "@/components/ui/tooltip";
// Import QueryClient and QueryClientProvider from the correct path if moved
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; 
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { AuthProvider } from "./contexts/AuthContext";

import Dashboard from "./pages/Index";
import Partners from "./pages/Partners";
import Templates from "./pages/Templates";
import Reports from "./pages/Reports";
import RequestSettings from "./pages/RequestSettings";
import { SoldRequest } from "./pages/SoldRequest";
import JurnalEmail from "./pages/JurnalEmail";
import Settings from "./pages/Settings"; // Import from the main Settings.tsx file
import Login from "./pages/Login";
import SchimbareParola from "./pages/SchimbareParola";
import NotFound from "./pages/NotFound";
import EmailPage from "./pages/Email";

// Initialize QueryClient
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/schimbare-parola" element={<SchimbareParola />} />
            <Route path="/" element={<DashboardLayout><Dashboard /></DashboardLayout>} />            <Route path="/parteneri" element={<DashboardLayout><Partners /></DashboardLayout>} />
            <Route path="/sabloane" element={<DashboardLayout><Templates /></DashboardLayout>} />
            <Route path="/rapoarte" element={<DashboardLayout><Reports /></DashboardLayout>} />
            <Route path="/cereri" element={<DashboardLayout><RequestSettings /></DashboardLayout>} />
            <Route path="/sold" element={<DashboardLayout><SoldRequest /></DashboardLayout>} />
            <Route path="/jurnal-email" element={<DashboardLayout><JurnalEmail /></DashboardLayout>} />
            <Route path="/email" element={<DashboardLayout><EmailPage /></DashboardLayout>} />
            <Route path="/setari" element={<DashboardLayout><Settings /></DashboardLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

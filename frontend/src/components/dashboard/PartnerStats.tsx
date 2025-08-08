
import { CheckCircle, XCircle, Clock, UserRound } from "lucide-react";
import { StatCard } from "./StatCard";
// Ensure correct path for types
import { PartnerStatsData } from "../../types/dashboard";

interface StatsData {
  totalPartners: number;
  respondedPartners: number;
  pendingPartners: number;
  lastRequestDate: string;
}

interface PartnerStatsProps {
  data: StatsData;
}

export function PartnerStats({ data }: PartnerStatsProps) {
  const responseRate = data.totalPartners > 0 
    ? Math.round((data.respondedPartners / data.totalPartners) * 100) 
    : 0;
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Parteneri"
        value={data.totalPartners}
        icon={<UserRound className="h-5 w-5" />}
      />
      <StatCard
        title="Parteneri cu Răspuns"
        value={data.respondedPartners}
        description={`${responseRate}% rată de răspuns`}
        icon={<CheckCircle className="h-5 w-5 text-success" />}
      />
      <StatCard
        title="Parteneri fără Răspuns"
        value={data.pendingPartners}
        icon={<XCircle className="h-5 w-5 text-destructive" />}
      />
      <StatCard
        title="Ultima Solicitare"
        value={data.lastRequestDate}
        icon={<Clock className="h-5 w-5" />}
      />
    </div>
  );
}

import { Stethoscope, Users, DollarSign, TrendingUp } from 'lucide-react';

interface ProviderMetricsProps {
  appointmentCount: number;
  patientCount: number;
  totalBilled: number;
  totalCollected: number;
  completionRate: number;
}

export function ProviderMetrics({ appointmentCount, patientCount, totalBilled, totalCollected, completionRate }: ProviderMetricsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <div className="bg-card border border-border rounded-xl p-4 text-center">
        <Users className="w-4 h-4 mx-auto mb-1 text-primary" />
        <p className="text-2xl font-bold text-foreground tabular-nums">{patientCount}</p>
        <p className="text-xs text-muted-foreground">Patients</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 text-center">
        <Stethoscope className="w-4 h-4 mx-auto mb-1 text-primary" />
        <p className="text-2xl font-bold text-foreground tabular-nums">{appointmentCount}</p>
        <p className="text-xs text-muted-foreground">Appointments</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 text-center">
        <TrendingUp className="w-4 h-4 mx-auto mb-1 text-success" />
        <p className="text-2xl font-bold text-success tabular-nums">{completionRate}%</p>
        <p className="text-xs text-muted-foreground">Completion Rate</p>
      </div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
        <DollarSign className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
        <p className="text-2xl font-bold text-emerald-600 tabular-nums">${totalBilled.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">Billed</p>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
        <DollarSign className="w-4 h-4 mx-auto mb-1 text-blue-600" />
        <p className="text-2xl font-bold text-blue-600 tabular-nums">${totalCollected.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">Collected</p>
      </div>
    </div>
  );
}

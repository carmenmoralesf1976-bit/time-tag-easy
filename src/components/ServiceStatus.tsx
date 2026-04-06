import { CheckCircle2, Clock } from "lucide-react";

interface ServiceStatusProps {
  hasClockedIn: boolean;
  guardName: string;
}

export default function ServiceStatus({ hasClockedIn, guardName }: ServiceStatusProps) {
  return (
    <div
      className={`mb-5 flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
        hasClockedIn
          ? "border-[hsl(var(--success))/0.4] bg-[hsl(var(--success))/0.08]"
          : "border-border bg-card"
      }`}
      style={{ animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 50ms forwards", opacity: 0 }}
    >
      {hasClockedIn ? (
        <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))] shrink-0" />
      ) : (
        <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
      )}
      <div>
        <p className="text-sm font-semibold text-foreground">Estado del Servicio</p>
        <p className={`text-xs ${hasClockedIn ? "text-[hsl(var(--success))]" : "text-muted-foreground"}`}>
          {hasClockedIn ? `${guardName} — En servicio` : "Pendiente de fichaje de entrada"}
        </p>
      </div>
      <span
        className={`ml-auto h-3 w-3 rounded-full shrink-0 ${
          hasClockedIn ? "bg-[hsl(var(--success))] animate-pulse" : "bg-muted-foreground/30"
        }`}
      />
    </div>
  );
}

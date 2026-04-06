import { User, BadgeCheck, Building2 } from "lucide-react";

interface GuardInfoProps {
  name: string;
  badgeId: string;
  workPost: string;
}

export default function GuardInfo({ name, badgeId, workPost }: GuardInfoProps) {
  return (
    <div
      className="mb-5 grid grid-cols-3 gap-2"
      style={{ animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 120ms forwards", opacity: 0 }}
    >
      <div className="rounded-2xl border border-border bg-card px-3 py-3 text-center">
        <User className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
        <p className="text-[10px] text-muted-foreground font-medium">Vigilante</p>
        <p className="text-xs font-bold text-foreground truncate">{name || "—"}</p>
      </div>
      <div className="rounded-2xl border border-border bg-card px-3 py-3 text-center">
        <BadgeCheck className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
        <p className="text-[10px] text-muted-foreground font-medium">Placa</p>
        <p className="text-xs font-bold text-foreground truncate">{badgeId || "—"}</p>
      </div>
      <div className="rounded-2xl border border-border bg-card px-3 py-3 text-center">
        <Building2 className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
        <p className="text-[10px] text-muted-foreground font-medium">Centro</p>
        <p className="text-xs font-bold text-foreground truncate">{workPost}</p>
      </div>
    </div>
  );
}

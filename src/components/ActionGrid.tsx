import { LogIn, LogOut, Flashlight, ClipboardEdit } from "lucide-react";

interface ActionGridProps {
  onEntrada: () => void;
  onSalida: () => void;
  onRonda: () => void;
  onIncidencia: () => void;
  loading: boolean;
  disabled: boolean;
}

export default function ActionGrid({ onEntrada, onSalida, onRonda, onIncidencia, loading, disabled }: ActionGridProps) {
  const isDisabled = loading || disabled;

  const tiles = [
    {
      label: "Entrada",
      icon: LogIn,
      onClick: onEntrada,
      className: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] shadow-[hsl(var(--success))/0.3]",
      hoverClass: "hover:shadow-xl hover:shadow-[hsl(var(--success))/0.4]",
    },
    {
      label: "Salida",
      icon: LogOut,
      onClick: onSalida,
      className: "bg-destructive text-destructive-foreground shadow-destructive/30",
      hoverClass: "hover:shadow-xl hover:shadow-destructive/40",
    },
    {
      label: "Rondas",
      icon: Flashlight,
      onClick: onRonda,
      className: "bg-accent text-accent-foreground shadow-accent/30",
      hoverClass: "hover:shadow-xl hover:shadow-accent/40",
    },
    {
      label: "Partes",
      icon: ClipboardEdit,
      onClick: onIncidencia,
      className: "bg-primary text-primary-foreground shadow-primary/30",
      hoverClass: "hover:shadow-xl hover:shadow-primary/40",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {tiles.map((tile, i) => (
        <button
          key={tile.label}
          onClick={tile.onClick}
          disabled={isDisabled}
          className={`flex flex-col items-center justify-center gap-3 rounded-2xl p-8 text-lg font-bold shadow-lg transition-all duration-200 ease-out active:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed ${tile.className} ${tile.hoverClass}`}
          style={{
            animation: `scale-in 0.35s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms forwards`,
            opacity: 0,
          }}
        >
          <tile.icon className="h-10 w-10" strokeWidth={2} />
          {tile.label}
        </button>
      ))}
    </div>
  );
}

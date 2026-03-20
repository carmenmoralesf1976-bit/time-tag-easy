import { LogIn, LogOut } from "lucide-react";

interface ClockButtonsProps {
  onClock: (type: "entrada" | "salida") => void;
  loading: boolean;
  disabled?: boolean;
}

export default function ClockButtons({ onClock, loading, disabled }: ClockButtonsProps) {
  const isDisabled = loading || disabled;

  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        onClick={() => onClock("entrada")}
        disabled={isDisabled}
        className="clock-btn-enter flex flex-col items-center justify-center gap-3 rounded-2xl p-8 text-lg font-semibold shadow-lg shadow-[hsl(var(--success)/0.2)] transition-all duration-200 ease-out hover:shadow-xl hover:shadow-[hsl(var(--success)/0.3)] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <LogIn className="h-8 w-8" strokeWidth={2.2} />
        Entrada
      </button>
      <button
        onClick={() => onClock("salida")}
        disabled={isDisabled}
        className="clock-btn-exit flex flex-col items-center justify-center gap-3 rounded-2xl p-8 text-lg font-semibold shadow-lg shadow-destructive/20 transition-all duration-200 ease-out hover:shadow-xl hover:shadow-destructive/30 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <LogOut className="h-8 w-8" strokeWidth={2.2} />
        Salida
      </button>
    </div>
  );
}

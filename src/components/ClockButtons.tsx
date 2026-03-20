import { LogIn, LogOut } from "lucide-react";

interface ClockButtonsProps {
  onClock: (type: "entrada" | "salida") => void;
  loading: boolean;
}

export default function ClockButtons({ onClock, loading }: ClockButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        onClick={() => onClock("entrada")}
        disabled={loading}
        className="clock-btn-enter flex flex-col items-center justify-center gap-3 rounded-2xl p-8 text-lg font-semibold shadow-lg shadow-success/20 transition-all duration-200 ease-out hover:shadow-xl hover:shadow-success/30 active:scale-[0.97] disabled:opacity-60"
      >
        <LogIn className="h-8 w-8" strokeWidth={2.2} />
        Entrada
      </button>
      <button
        onClick={() => onClock("salida")}
        disabled={loading}
        className="clock-btn-exit flex flex-col items-center justify-center gap-3 rounded-2xl p-8 text-lg font-semibold shadow-lg shadow-destructive/20 transition-all duration-200 ease-out hover:shadow-xl hover:shadow-destructive/30 active:scale-[0.97] disabled:opacity-60"
      >
        <LogOut className="h-8 w-8" strokeWidth={2.2} />
        Salida
      </button>
    </div>
  );
}

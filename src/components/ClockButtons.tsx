import { LogIn, LogOut, AlertCircle } from "lucide-react";

interface ClockButtonsProps {
  onClock: (type: "entrada" | "salida") => void;
  onDelay?: () => void;
  loading: boolean;
  disabled?: boolean;
}

export default function ClockButtons({ onClock, onDelay, loading, disabled }: ClockButtonsProps) {
  const isDisabled = loading || disabled;

  return (
    <div className="space-y-3">
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
      <button
        onClick={onDelay}
        disabled={isDisabled}
        className="mx-auto flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <AlertCircle className="h-4 w-4" />
        Avisar Retraso
      </button>
    </div>
  );
}
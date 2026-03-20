import { useRef, useEffect, useState, useCallback } from "react";
import { Eraser } from "lucide-react";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

export default function SignaturePad({ onSave, onCancel }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  const getPos = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "hsl(220 20% 14%)";
  }, []);

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setDrawing(true);
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    const dpr = window.devicePixelRatio || 1;
    ctx.beginPath();
    ctx.moveTo(x / dpr, y / dpr);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    const dpr = window.devicePixelRatio || 1;
    ctx.lineTo(x / dpr, y / dpr);
    ctx.stroke();
    setHasStrokes(true);
  };

  const endDraw = () => setDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasStrokes(false);
  };

  const save = () => {
    if (!hasStrokes) return;
    onSave(canvasRef.current!.toDataURL("image/png"));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm"
      style={{ animation: "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards" }}
    >
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-card p-6 shadow-xl">
        <h3 className="text-lg font-semibold mb-1">Firma digital</h3>
        <p className="text-sm text-muted-foreground mb-4">Firma con el dedo para confirmar tu salida</p>

        <div className="relative rounded-xl border-2 border-dashed border-border bg-secondary/30 overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full touch-none"
            style={{ height: 200 }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          {!hasStrokes && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-muted-foreground/40 text-sm">Dibuja tu firma aquí</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={clear}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary active:scale-[0.97]"
          >
            <Eraser className="h-4 w-4" /> Borrar
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary active:scale-[0.97]"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={!hasStrokes}
            className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.97] disabled:opacity-40"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

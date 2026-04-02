import { useState } from "react";
import { ShieldCheck, User, KeyRound, Lock, Mail } from "lucide-react";
import logoImg from "@/assets/logo-pycseca.jpg";
import { supabase } from "@/integrations/supabase/client";
import { GUARDS } from "@/lib/guards";
import { toast } from "sonner";

export default function Login() {
  const [tab, setTab] = useState<"guard" | "admin">("guard");

  // Guard state
  const [badgeId, setBadgeId] = useState("");
  const [pin, setPin] = useState("");
  const [guardLoading, setGuardLoading] = useState(false);

  // Admin state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  const handleGuardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeId.trim() || !pin.trim()) {
      toast.error("Introduce tu nº de placa y PIN");
      return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast.error("El PIN debe ser de 4 dígitos");
      return;
    }

    setGuardLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("guard-login", {
        body: { badge_id: badgeId.trim(), pin },
      });

      if (error || data?.error) {
        toast.error(data?.error || "Error al iniciar sesión");
        setGuardLoading(false);
        return;
      }

      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        toast.success("¡Sesión iniciada!");
      }
    } catch {
      toast.error("Error de conexión");
    }
    setGuardLoading(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Introduce email y contraseña");
      return;
    }

    setAdminLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      toast.error("Credenciales incorrectas");
    } else {
      toast.success("¡Sesión de administrador iniciada!");
    }
    setAdminLoading(false);
  };

  const guard = GUARDS.find((g) => g.badgeId === badgeId.trim());

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-lg"
        style={{ animation: "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) forwards" }}
      >
        {/* Logo & header */}
        <div className="text-center mb-6">
          <img src={logoImg} alt="PYCSECA Seguridad" className="mx-auto mb-4 h-16 w-auto object-contain" />
          <h1 className="text-xl font-bold tracking-tight text-primary">PYCSECA - Control de Presencia</h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
            Kuehne Nagel Cabanillas · Guadalajara
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex rounded-xl bg-muted p-1">
          <button
            onClick={() => setTab("guard")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === "guard" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="inline h-4 w-4 mr-1 -mt-0.5" />
            Vigilante
          </button>
          <button
            onClick={() => setTab("admin")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === "admin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="inline h-4 w-4 mr-1 -mt-0.5" />
            Administrador
          </button>
        </div>

        {/* Guard login */}
        {tab === "guard" && (
          <form onSubmit={handleGuardLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <KeyRound className="h-4 w-4" /> Nº Placa / DNI
              </label>
              <input
                type="text"
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                placeholder="Ej: 173857"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base font-medium placeholder:text-muted-foreground/40 outline-none ring-ring/20 transition-shadow focus:ring-2 focus:border-foreground/20"
              />
              {guard && (
                <p className="mt-1.5 text-xs text-[hsl(var(--success))] font-medium">
                  ✓ {guard.name}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Lock className="h-4 w-4" /> PIN (4 dígitos)
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-center text-2xl tracking-[0.5em] font-medium placeholder:text-muted-foreground/40 placeholder:text-base placeholder:tracking-normal outline-none ring-ring/20 transition-shadow focus:ring-2 focus:border-foreground/20"
              />
            </div>
            <button
              type="submit"
              disabled={guardLoading}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {guardLoading ? "Iniciando sesión…" : "Entrar"}
            </button>
            <p className="text-[11px] text-center text-muted-foreground/60">
              PIN por defecto: 1234. Contacta con tu supervisor para cambiarlo.
            </p>
          </form>
        )}

        {/* Admin login */}
        {tab === "admin" && (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Mail className="h-4 w-4" /> Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pycseca.es"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base font-medium placeholder:text-muted-foreground/40 outline-none ring-ring/20 transition-shadow focus:ring-2 focus:border-foreground/20"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Lock className="h-4 w-4" /> Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base font-medium placeholder:text-muted-foreground/40 outline-none ring-ring/20 transition-shadow focus:ring-2 focus:border-foreground/20"
              />
            </div>
            <button
              type="submit"
              disabled={adminLoading}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {adminLoading ? "Iniciando sesión…" : "Acceder como administrador"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

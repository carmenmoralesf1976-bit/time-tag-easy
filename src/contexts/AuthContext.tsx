import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type UserRole = "admin" | "guard" | null;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole;
  badgeId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  badgeId: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [badgeId, setBadgeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    return (data?.role as UserRole) ?? null;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const metadata = session.user.user_metadata;
          setBadgeId(metadata?.badge_id ?? null);

          // Defer role fetch to avoid deadlock
          setTimeout(async () => {
            const r = await fetchRole(session.user.id);
            setRole(r);
            setLoading(false);
          }, 0);
        } else {
          setRole(null);
          setBadgeId(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
    setBadgeId(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, badgeId, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

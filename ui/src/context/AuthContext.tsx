import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

/**
 * What AuthContext provides to every component in the tree:
 * - user: the logged-in Supabase user (null if not logged in)
 * - session: the full session including the JWT token
 * - loading: true while we're checking if user is already logged in
 * - signOut: function to log out
 */
interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider wraps the entire app (in main.tsx).
 * It checks if the user is already logged in on mount,
 * and listens for auth state changes (login, logout, token refresh).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /**
     * getSession() checks localStorage for an existing session.
     * If the user logged in before and the token is still valid,
     * they won't need to log in again.
     */
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    /**
     * onAuthStateChange fires whenever auth state changes:
     * - SIGNED_IN: user just logged in
     * - SIGNED_OUT: user logged out
     * - TOKEN_REFRESHED: Supabase auto-refreshed the JWT
     *
     * This keeps user/session state in sync automatically.
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Cleanup subscription when AuthProvider unmounts
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange will fire with null session automatically
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth — hook to access auth state from any component.
 * Throws if used outside AuthProvider (catches mistakes early).
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
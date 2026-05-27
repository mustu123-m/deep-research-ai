import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

/**
 * ProtectedRoute wraps any page that requires login.
 *
 * Three states:
 * 1. loading=true  → still checking session, show nothing (avoids flash)
 * 2. user=null     → not logged in, redirect to /login
 * 3. user exists   → logged in, render the page normally
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // Still checking localStorage for existing session
  // Don't render anything to avoid a flash of the login page
  if (loading) return null;

  // Not logged in — redirect to login
  // "replace" means the login page replaces the current history entry
  // so pressing Back doesn't loop back to the protected page
  if (!user) return <Navigate to="/login" replace />;

  // Logged in — render the actual page
  return <>{children}</>;
}
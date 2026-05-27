import { Routes, Route, NavLink, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Home } from "@/pages/Home";
import { History } from "@/pages/History";
import { ReportPage } from "@/pages/ReportPage";
import { Login } from "@/pages/Login";
import { Signup } from "@/pages/Signup";
import styles from "./App.module.css";

export function App() {
  const { user, signOut, loading } = useAuth();
  const location = useLocation();

  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup";
  const isReport   = location.pathname.startsWith("/report");

  // Don't render layout while checking session
  if (loading) return null;

  return (
    <div className={styles.app}>
      <div className={styles.noise} aria-hidden />
      <div className={styles.glow}  aria-hidden />

      <div className={styles.inner}>
        {/* Header only shown on app pages, not auth pages */}
        {!isAuthPage && (
          <header className={styles.header}>
            <div className={styles.logo}>
              <span className={styles.logoTitle}>Research Pipeline</span>
              <span className={styles.logoSub}>Multi-Agent · LangGraph · Gemini</span>
            </div>

            {/* Nav only shown when logged in and not on report page */}
            {user && !isReport && (
              <div className={styles.headerRight}>
                <nav className={styles.nav}>
                  <NavLink
                    to="/"
                    end
                    className={({ isActive }) =>
                      `${styles.navTab} ${isActive ? styles.navTabActive : ""}`
                    }
                  >
                    New run
                  </NavLink>
                  <NavLink
                    to="/history"
                    className={({ isActive }) =>
                      `${styles.navTab} ${isActive ? styles.navTabActive : ""}`
                    }
                  >
                    History
                  </NavLink>
                </nav>

                {/* Show user email and sign out button */}
                <div className={styles.userArea}>
                  <span className={styles.userEmail}>{user.email}</span>
                  <button className={styles.signOutBtn} onClick={signOut}>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </header>
        )}

        <main>
          <Routes>
            {/* Public routes */}
            <Route path="/login"  element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected routes — redirect to /login if not authenticated */}
            <Route path="/" element={
              <ProtectedRoute><Home /></ProtectedRoute>
            } />
            <Route path="/history" element={
              <ProtectedRoute><History /></ProtectedRoute>
            } />
            <Route path="/report/:runId" element={
              <ProtectedRoute><ReportPage /></ProtectedRoute>
            } />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
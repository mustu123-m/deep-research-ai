import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { App } from "./App";
import "./index.css";

/**
 * Wrapping order matters:
 * BrowserRouter  — must be outermost so hooks like useNavigate work in AuthProvider
 * AuthProvider   — provides user/session to everything below
 * App            — the actual app with routes and pages
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
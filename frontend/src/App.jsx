import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ThemeToggle from "./components/ThemeToggle";
import PatientPage from "./pages/PatientPage";
import StaffLoginPage from "./pages/StaffLoginPage";
import StaffDashboardPage from "./pages/StaffDashboardPage";

function StaffRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="app app--login">
        <div className="login-card">
          <p className="muted-text">Loading...</p>
        </div>
      </div>
    );
  }
  if (!user) {
    return <StaffLoginPage />;
  }
  return children;
}

export default function App() {
  return (
    <div className="app-shell">
      <ThemeToggle />
      <Routes>
        <Route path="/" element={<PatientPage />} />
        <Route path="/patient" element={<Navigate to="/" replace />} />
        <Route
          path="/staff"
          element={
            <StaffRoute>
              <StaffDashboardPage />
            </StaffRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { AppShell } from "./components/AppShell";
import { ToastProvider } from "./components/Toast";
import Agenda from "./pages/Agenda";
import BusinessHours from "./pages/BusinessHours";
import Courts from "./pages/Courts";
import Login from "./pages/Login";
import MonthlyCustomers from "./pages/MonthlyCustomers";

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<Agenda />} />
            <Route path="/mensalistas" element={<MonthlyCustomers />} />
            <Route path="/quadras" element={<Courts />} />
            <Route path="/horarios" element={<BusinessHours />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}

import { AppShell } from "./components/AppShell";
import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { SubmitPage } from "./pages/SubmitPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route element={<SubmitPage />} path="/submit" />
        <Route element={<DashboardPage />} path="/dashboard" />
        <Route element={<Navigate replace to="/submit" />} path="*" />
      </Routes>
    </AppShell>
  );
}

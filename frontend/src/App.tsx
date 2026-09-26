import { AppShell } from "./components/AppShell";
import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { StatsPage } from "./pages/StatsPage";
import { SubmitPage } from "./pages/SubmitPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route element={<SubmitPage />} path="/submit" />
        <Route element={<DashboardPage />} path="/dashboard" />
        <Route element={<StatsPage />} path="/stats" />
        <Route element={<Navigate replace to="/submit" />} path="*" />
      </Routes>
    </AppShell>
  );
}

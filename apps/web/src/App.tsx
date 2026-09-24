import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { PublicOnlyRoute } from "@/routes/PublicOnlyRoute";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ResumePage } from "@/pages/ResumePage";
import { ComingSoonPage } from "@/pages/ComingSoonPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route element={<PublicOnlyRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/jobs" element={<ComingSoonPage title="Find Jobs" phase="Phase 3 — Job Discovery" />} />
          <Route
            path="/applications"
            element={<ComingSoonPage title="Applications" phase="Phase 6 — Application Engine" />}
          />
          <Route path="/agent" element={<ComingSoonPage title="Agent" phase="Phase 8 — Autonomous Agent" />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/resume" element={<ResumePage />} />
          <Route
            path="/preferences"
            element={<ComingSoonPage title="Preferences" phase="Phase 4 — AI Matching" />}
          />
          <Route
            path="/analytics"
            element={<ComingSoonPage title="Analytics" phase="Phase 9 — Dashboard + Analytics" />}
          />
          <Route path="/settings" element={<ComingSoonPage title="Settings" phase="Phase 10 — Security" />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

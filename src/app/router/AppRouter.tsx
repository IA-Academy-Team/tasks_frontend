import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AuthLayout } from "../layouts/AuthLayout";
import { RoleAwareLayout } from "../layouts/RoleAwareLayout";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { RoleGuard } from "../guards/RoleGuard";
import { LoginPage } from "../../modules/auth/pages/LoginPage";
import { RegisterPage } from "../../modules/auth/pages/RegisterPage";
import { ForgotPasswordPage } from "../../modules/auth/pages/ForgotPasswordPage";
import { DashboardPage } from "../../modules/dashboard/pages/DashboardPage";
import { ProjectsPage } from "../../modules/projects/pages/ProjectsPage";
import { ProjectBoardPage } from "../../modules/projects/pages/ProjectBoardPage";
import { MembersPage } from "../../modules/employees/pages/MembersPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/recuperar-contraseña" element={<ForgotPasswordPage />} />
        </Route>

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RoleAwareLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectBoardPage />} />
          <Route
            path="members"
            element={
              <RoleGuard allowedRoles={["admin"]}>
                <MembersPage />
              </RoleGuard>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AuthLayout } from "../layouts/AuthLayout";
import { RoleAwareLayout } from "../layouts/RoleAwareLayout";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { RoleGuard } from "../guards/RoleGuard";
import { ResourceGuard } from "../guards/ResourceGuard";
import { LoginPage } from "../../modules/auth/pages/LoginPage";
import { RegisterPage } from "../../modules/auth/pages/RegisterPage";
import { ForgotPasswordPage } from "../../modules/auth/pages/ForgotPasswordPage";
import { AuthHomeRedirect } from "../../modules/auth/components/AuthHomeRedirect";
import { AreasPage } from "../../modules/areas/pages/AreasPage";
import { DashboardPage } from "../../modules/dashboard/pages/DashboardPage";
import { ProjectsPage } from "../../modules/projects/pages/ProjectsPage";
import { ProjectBoardPage } from "../../modules/projects/pages/ProjectBoardPage";
import { EmployeesPage } from "../../modules/employees/pages/EmployeesPage";

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
          <Route index element={<AuthHomeRedirect />} />
          <Route
            path="app/admin/dashboard"
            element={
              <RoleGuard allowedRoles={["admin"]}>
                <DashboardPage />
              </RoleGuard>
            }
          />
          <Route
            path="app/employee/dashboard"
            element={
              <RoleGuard allowedRoles={["employee"]}>
                <DashboardPage />
              </RoleGuard>
            }
          />
          <Route
            path="areas"
            element={(
              <ResourceGuard resource="areas">
                <AreasPage />
              </ResourceGuard>
            )}
          />
          <Route
            path="employees"
            element={(
              <ResourceGuard resource="employees">
                <EmployeesPage />
              </ResourceGuard>
            )}
          />
          <Route
            path="projects"
            element={(
              <ResourceGuard resource="projects">
                <ProjectsPage />
              </ResourceGuard>
            )}
          />
          <Route
            path="projects/:projectId"
            element={(
              <ResourceGuard resource="projectBoard">
                <ProjectBoardPage />
              </ResourceGuard>
            )}
          />
          <Route path="profile" element={<Navigate to="/" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

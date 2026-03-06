import { useAuth } from "../context/AuthContext";
import { AdminLayout } from "./AdminLayout";
import { EmployeeLayout } from "./EmployeeLayout";

export function RoleAwareLayout() {
  const { user } = useAuth();

  if (user?.role === "admin") {
    return <AdminLayout />;
  }

  return <EmployeeLayout />;
}

import type { PropsWithChildren } from "react";
import { AuthProvider } from "../context/AuthContext";
import { SessionProvider } from "../../modules/auth/providers/SessionProvider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SessionProvider>
      <AuthProvider>{children}</AuthProvider>
    </SessionProvider>
  );
}

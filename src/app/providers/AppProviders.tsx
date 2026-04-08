import type { PropsWithChildren } from "react";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "../context/AuthContext";
import { SessionProvider } from "../../modules/auth/providers/SessionProvider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SessionProvider>
        <AuthProvider>{children}</AuthProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

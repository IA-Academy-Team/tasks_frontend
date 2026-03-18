import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeFloatingToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isDarkMode = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDarkMode ? "light" : "dark")}
      className="fixed bottom-4 right-4 z-[1200] inline-flex size-11 items-center justify-center rounded-2xl border border-border bg-card text-foreground shadow-[0_10px_24px_rgba(16,36,58,0.18)] transition-all hover:bg-secondary hover:scale-[1.02] m-4"
      aria-label={isDarkMode ? "Activar modo claro" : "Activar modo oscuro"}
      title={isDarkMode ? "Modo claro" : "Modo oscuro"}
    >
      {isDarkMode ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}

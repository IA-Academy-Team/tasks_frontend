import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
    <motion.button
      type="button"
      onClick={() => setTheme(isDarkMode ? "light" : "dark")}
      className="fixed bottom-4 right-4 z-[1200] inline-flex size-11 items-center justify-center rounded-2xl border border-border bg-card text-foreground shadow-[0_10px_24px_rgba(16,36,58,0.18)] transition-all hover:bg-secondary hover:scale-[1.02] m-4"
      aria-label={isDarkMode ? "Activar modo claro" : "Activar modo oscuro"}
      title={isDarkMode ? "Modo claro" : "Modo oscuro"}
      initial={{ opacity: 0, y: 10, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 310, damping: 24, mass: 0.72 }}
      whileHover={{ y: -2, scale: 1.04 }}
      whileTap={{ scale: 0.94, y: 0 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDarkMode ? (
          <motion.span
            key="sun"
            initial={{ opacity: 0, rotate: -40, scale: 0.72 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 40, scale: 0.72 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Sun className="size-5" />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ opacity: 0, rotate: 40, scale: 0.72 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -40, scale: 0.72 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Moon className="size-5" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

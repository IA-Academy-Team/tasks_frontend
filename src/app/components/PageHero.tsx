import type { ReactNode } from "react";
import { cn } from "./ui/utils";

type PageHeroProps = {
  title: string;
  subtitle: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHero({
  title,
  subtitle,
  actions,
  className,
}: PageHeroProps) {
  return (
    <header className={cn("app-hero", className)}>
      <div className="h-full flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h1 className="app-title text-foreground">{title}</h1>
            <p className="app-subtitle text-muted-foreground truncate">{subtitle}</p>
          </div>
        </div>
        {actions && <div className="shrink-0 text-foreground">{actions}</div>}
      </div>
    </header>
  );
}

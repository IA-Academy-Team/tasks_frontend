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
  icon,
  actions,
  className,
}: PageHeroProps) {
  return (
    <header className={cn("app-hero", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && <div className="app-icon-pill text-primary-foreground">{icon}</div>}
          <div>
            <h1 className="app-title text-primary-foreground">{title}</h1>
            <p className="app-subtitle text-primary-foreground/85">{subtitle}</p>
          </div>
        </div>
        {actions && <div className="shrink-0 text-primary-foreground">{actions}</div>}
      </div>
    </header>
  );
}

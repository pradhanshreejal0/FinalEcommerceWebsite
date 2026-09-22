import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/useTheme";
import { cn } from "cn";

export function ThemeToggle({ className }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      className={cn(
        "group relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border border-border p-1 transition-colors duration-300",
        "bg-linear-to-r from-amber-300 via-orange-300 to-amber-200",
        "dark:from-indigo-950 dark:via-violet-950 dark:to-indigo-900",
        "shadow-inner focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
    >
      {/* Decorative stars, only visible in dark mode */}
      <span className="pointer-events-none absolute left-2.5 top-2 h-0.5 w-0.5 rounded-full bg-primary-foreground opacity-0 transition-opacity duration-300 dark:opacity-80" />
      <span className="pointer-events-none absolute left-5 top-4.5 h-1 w-1 rounded-full bg-primary-foreground opacity-0 transition-opacity duration-300 dark:opacity-60" />
      <span className="pointer-events-none absolute left-3.5 bottom-1.5 h-0.5 w-0.5 rounded-full bg-primary-foreground opacity-0 transition-opacity duration-300 dark:opacity-70" />

      {/* Sliding knob */}
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full bg-card shadow-md ring-1 ring-border/50 transition-transform duration-300 ease-out",
          "dark:bg-card dark:ring-border",
          isDark ? "translate-x-7" : "translate-x-0"
        )}
      >
        <Sun
          className={cn(
            "absolute h-4 w-4 text-warning transition-all duration-300",
            isDark
              ? "scale-0 rotate-90 opacity-0"
              : "scale-100 rotate-0 opacity-100"
          )}
        />
        <Moon
          className={cn(
            "absolute h-4 w-4 text-primary transition-all duration-300",
            isDark
              ? "scale-100 rotate-0 opacity-100"
              : "scale-0 -rotate-90 opacity-0"
          )}
        />
      </span>
    </button>
  );
}

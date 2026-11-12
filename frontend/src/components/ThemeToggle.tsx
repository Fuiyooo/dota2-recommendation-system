import { useSyncExternalStore } from "react";
import { applyTheme, getTheme, subscribeTheme, type Theme } from "../theme";

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => "light" as Theme);
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={`button ${className ?? ""}`}
      aria-pressed={isDark}
      onClick={() => applyTheme(isDark ? "light" : "dark")}
    >
      Dark mode
    </button>
  );
}

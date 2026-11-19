"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  const toggle = () => {
    // Read the actual rendered theme from the DOM to avoid hydration timing
    // issues and render-time theme lookups.
    const isDark =
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      aria-label="Toggle color theme"
      onClick={toggle}
    >
      {/* Icons swap purely via CSS (dark: variant) — no JS state needed. */}
      <Sun className="hidden h-5 w-5 dark:block" />
      <Moon className="h-5 w-5 dark:hidden" />
    </Button>
  );
}

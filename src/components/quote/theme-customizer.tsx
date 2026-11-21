"use client";

import { useState, useEffect, useCallback } from "react";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// Preset color themes. Each overrides the --primary CSS variable.
const THEMES = [
  { name: "Amber", color: "#d97706", fg: "#fff9ee" },
  { name: "Emerald", color: "#059669", fg: "#ecfdf5" },
  { name: "Violet", color: "#7c3aed", fg: "#f5f3ff" },
  { name: "Rose", color: "#e11d48", fg: "#fff1f2" },
  { name: "Cyan", color: "#0891b2", fg: "#ecfeff" },
  { name: "Orange", color: "#ea580c", fg: "#fff7ed" },
  { name: "Teal", color: "#0d9488", fg: "#f0fdfa" },
  { name: "Indigo", color: "#4f46e5", fg: "#eef2ff" },
];

const STORAGE_KEY = "quote-vault-theme";

function applyTheme(idx: number) {
  const theme = THEMES[idx];
  if (!theme) return;
  const root = document.documentElement;
  root.style.setProperty("--primary", theme.color);
  root.style.setProperty("--primary-foreground", theme.fg);
  root.style.setProperty("--accent", theme.color);
}

export function ThemeCustomizer() {
  const [current, setCurrent] = useState(() => {
    if (typeof window === "undefined") return 0;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const idx = THEMES.findIndex((t) => t.name === saved);
      if (idx >= 0) return idx;
    }
    return 0;
  });

  useEffect(() => {
    applyTheme(current);
  }, [current]);

  const select = useCallback((idx: number) => {
    setCurrent(idx);
    applyTheme(idx);
    localStorage.setItem(STORAGE_KEY, THEMES[idx].name);
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="Color theme"
        >
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs">
          Color theme
        </DropdownMenuLabel>
        <div className="grid grid-cols-4 gap-2 p-2">
          {THEMES.map((t, i) => (
            <button
              key={t.name}
              onClick={() => select(i)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-transform hover:scale-110 ${
                i === current ? "ring-2 ring-offset-2" : ""
              }`}
              style={{ backgroundColor: t.color }}
              aria-label={t.name}
              title={t.name}
            >
              {i === current && (
                <span className="text-xs font-bold text-white">✓</span>
              )}
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

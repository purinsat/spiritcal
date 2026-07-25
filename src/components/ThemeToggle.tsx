"use client";

import { useEffect, useState } from "react";
import { getStoredTheme, storeTheme } from "@/lib/storage";
import { Button } from "@/components/ui";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = getStoredTheme();
    const initial =
      stored ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    storeTheme(next);
  };

  return (
    <Button variant="outline" size="sm" onClick={toggle} title="Toggle theme">
      {theme === "dark" ? "☀ Light" : "☾ Dark"}
    </Button>
  );
}

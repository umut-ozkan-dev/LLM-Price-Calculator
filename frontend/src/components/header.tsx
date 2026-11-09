"use client";

import { Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const dark = !mounted || resolvedTheme !== "light";

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex items-baseline gap-2 rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <span className="text-sm font-semibold tracking-tight">LLM Prompt Price</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">Calculator</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1" aria-label="Primary">
          <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Estimate
          </Link>
          <Link href="/models" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Models
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            onClick={() => setTheme(dark ? "light" : "dark")}
          >
            {dark ? <Sun /> : <Moon />}
          </Button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

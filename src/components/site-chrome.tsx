import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { site } from "@/data/site";
import { ExtLinks } from "./ext-links";
import { Button } from "@/components/ui/button";
import { BrandSymbol, Wordmark } from "@/components/wordmark";

const nav = [
  { to: "/", label: "Home" },
  { to: "/archive", label: "Archive" },
  { to: "/about", label: "About" },
] as const;

export function Logo({ variant = "symbol" }: { variant?: "symbol" | "wordmark" }) {
  return (
    <Link to="/" className="group inline-flex min-h-11 min-w-11 items-center" aria-label="VTMN home">
      {variant === "symbol" ? <BrandSymbol /> : <Wordmark className="vtmn-wordmark-compact" />}
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo variant="wordmark" />
        <nav aria-label="Main" className="hidden gap-8 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-accent-glow [&[data-status=active]]:text-accent-glow"
              activeOptions={{ exact: true }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Button
          variant="ghost"
          size="icon"
          className="text-foreground md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>
      {open && (
        <nav aria-label="Mobile" className="border-t border-border/60 px-5 py-4 md:hidden">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="block py-3 font-display text-2xl font-medium leading-snug text-muted-foreground [&[data-status=active]]:text-accent-glow"
              activeOptions={{ exact: true }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-5 py-8">
        <ExtLinks className="justify-center font-normal" />
        <p className="mt-6 text-center text-xs font-normal text-muted-foreground">
          © {new Date().getFullYear()} {site.name}
          <span aria-hidden="true"> · </span>
          <a
            href="/privacy"
            className="underline underline-offset-4 hover:text-accent-glow focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            Privacy
          </a>
        </p>
      </div>
    </footer>
  );
}

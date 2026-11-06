import { site } from "@/data/site";

// Measured approved Inter pill widths: removing SOON must not shift footer wrapping.
// Minimums allow the links to expand naturally if a visitor enlarges the text.
const pillMinWidth: Record<string, number> = {
  GitHub: 121.546875,
  Discord: 126.765625,
  LinkedIn: 131.59375,
  Email: 111.203125,
};

export function ExtLinks({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {site.links.map((l) =>
        l.href ? (
          <li key={l.label} className="flex">
            <a
              href={l.href}
              target={l.href.startsWith("mailto:") ? undefined : "_blank"}
              rel={l.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
              style={{ minInlineSize: pillMinWidth[l.label] }}
              className="inline-flex items-center justify-center rounded-md border border-dashed border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-accent-glow focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              {l.label}
            </a>
          </li>
        ) : (
          <li
            key={l.label}
            title="Link coming soon"
            className="rounded-md border border-dashed border-border px-4 py-1.5 text-sm text-muted-foreground"
          >
            {l.label} <span className="text-[10px] uppercase tracking-wider">· soon</span>
          </li>
        ),
      )}
    </ul>
  );
}

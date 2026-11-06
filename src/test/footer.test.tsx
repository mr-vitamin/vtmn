import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SiteFooter } from "@/components/site-chrome";

afterEach(cleanup);

describe("Shared footer destinations", () => {
  it("uses the four approved destinations with website-only new tabs", () => {
    render(<SiteFooter />);
    for (const [label, href] of [
      ["GitHub", "https://github.com/mr-vitamin"],
      ["Discord", "https://discord.com/users/1328588150326562917"],
      ["LinkedIn", "https://www.linkedin.com/in/alexander-ceran/"],
    ] as const) {
      const link = screen.getByRole("link", { name: label });
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    const email = screen.getByRole("link", { name: "Email" });
    expect(email).toHaveAttribute("href", "mailto:alexanderceran1@gmail.com");
    expect(email).not.toHaveAttribute("target");
    expect(email).not.toHaveAttribute("rel");
  });

  it("keeps the five-item order with only Amazon unavailable", () => {
    render(<SiteFooter />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.textContent?.trim())).toEqual([
      "GitHub",
      "Discord",
      "Amazon · soon",
      "LinkedIn",
      "Email",
    ]);
    expect(screen.getAllByRole("link")).toHaveLength(5);
    expect(within(items[2]!).queryByRole("link")).not.toBeInTheDocument();
    expect(items[2]).toHaveAttribute("title", "Link coming soon");
    expect(items[2]).not.toHaveAttribute("tabindex");
  });

  it("makes each active destination keyboard-focusable", () => {
    render(<SiteFooter />);
    for (const name of ["GitHub", "Discord", "LinkedIn", "Email"]) {
      const link = screen.getByRole("link", { name });
      link.focus();
      expect(link).toHaveFocus();
      expect(link).not.toHaveAttribute("aria-disabled");
    }
  });

  it("provides a keyboard-accessible privacy notice in the same tab", () => {
    render(<SiteFooter />);
    const link = screen.getByRole("link", { name: "Privacy" });
    expect(link).toHaveAttribute("href", "/privacy");
    expect(link).not.toHaveAttribute("target");
    link.focus();
    expect(link).toHaveFocus();
  });
});

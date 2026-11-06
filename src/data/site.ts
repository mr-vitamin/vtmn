// Site-wide configuration. Edit links here — every page and the footer read from this file.
// Confirmed destinations only; Amazon remains unavailable until an official listing exists.
// Links with an empty `href` are shown as "coming soon" and are not clickable.

export type ExternalLink = { label: string; href: string };

export const site = {
  name: "VTMN",
  short: "VTMN",
  tagline: "Independent ideas. An evolving body of work.",
  links: [
    { label: "GitHub", href: "https://github.com/mr-vitamin" },
    { label: "Discord", href: "https://discord.com/users/1328588150326562917" },
    { label: "Amazon", href: "" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/alexander-ceran/" },
    { label: "Email", href: "mailto:alexanderceran1@gmail.com" },
  ] as ExternalLink[],
};

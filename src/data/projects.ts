// Shared Archive/detail catalog. Release statuses were confirmed by the owner
// in the November 7, 2026 artwork and release update.
export const CATEGORIES = [
  "Cybersecurity",
  "Software",
  "Artificial Intelligence",
  "Website",
  "Literature",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type Status = "released" | "upcoming";

export type ProjectOverviewParagraph = { text: string; emphasis?: string };

export type Project = {
  id: string;
  slug: string;
  name: string;
  category: Category;
  status: Status;
  type: string;
  description: string;
  order: number;
  series?: { title: string; order?: number };
  image?: string;
  imageAlt?: string;
  heroImage?: string;
  heroImageAlt?: string;
  links?: readonly { label: string; href: string }[];
  overview?: readonly ProjectOverviewParagraph[];
  // Retained for existing collection helpers and future homepage integration.
  year?: string;
  featured?: boolean;
  spotlight?: boolean;
};

export const projects: readonly Project[] = [
  {
    id: "shrouded-reign-book-1",
    slug: "the-shrouded-reign-book-1",
    name: "Bound by Ash and Fire",
    category: "Literature",
    status: "upcoming",
    type: "Novel",
    order: 10,
    description: "The first planned novel in The Shrouded Reign epic fantasy series.",
    series: { title: "The Shrouded Reign", order: 1 },
    overview: [
      {
        text: "Every world has its history. Its legends, its conflicts, and the truths buried beneath generations of memory. But the most compelling stories often begin when someone discovers that the world they thought they understood is far more complicated than it appears.",
      },
      {
        text: "The Shrouded Reign is an epic high-fantasy series conceived as a sweeping saga spanning multiple novels. The series explores an original fantasy world through interconnected characters, conflicts, and mysteries.",
        emphasis: "The Shrouded Reign",
      },
      {
        text: "The first novel marks the beginning of that journey, introducing readers to a larger story intended to unfold across several books.",
      },
    ],
  },
  {
    id: "shrouded-reign-book-2",
    slug: "the-shrouded-reign-book-2",
    name: "Torn by Fate and Duty",
    category: "Literature",
    status: "upcoming",
    type: "Novel",
    order: 20,
    description: "The second planned novel in The Shrouded Reign epic fantasy series.",
    series: { title: "The Shrouded Reign", order: 2 },
    overview: [
      {
        text: "A story rarely ends where its first chapter leads us to believe. As characters make their choices and the world around them changes, the consequences can reach far beyond anything they initially imagined.",
      },
      {
        text: "The second novel in The Shrouded Reign continues the planned epic fantasy saga, building upon the world and narrative established in the opening book.",
        emphasis: "The Shrouded Reign",
      },
      {
        text: "As part of a larger interconnected series, the novel represents another chapter in a story designed to develop across multiple installments, with each book contributing to the broader journey.",
      },
    ],
  },
  {
    id: "wet-paper-website",
    slug: "wet-paper-magazine-website",
    name: "Wet Paper Magazine Website",
    category: "Website",
    status: "upcoming",
    type: "Website",
    order: 30,
    description: "The dedicated website project for Wet Paper Magazine.",
    overview: [
      {
        text: "Every piece of writing begins somewhere, but finding a place where those words can be shared, discovered, and appreciated is another journey entirely.",
      },
      {
        text: "The Wet Paper Magazine website is a digital home for an independent literary magazine. Designed with the character of a traditional newspaper in mind, the site brings together published issues, contributor information, and a space for readers to explore the magazine's work.",
      },
      {
        text: "Behind its vintage-inspired appearance is a modern website built to support the magazine's growing collection of creative voices, providing a lasting place for the stories and artwork it publishes.",
      },
    ],
  },
  {
    id: "7-tools-7-days",
    slug: "7-tools-in-7-days",
    name: "7 Tools in 7 Days",
    category: "Cybersecurity",
    status: "released",
    type: "Technical project",
    order: 40,
    description:
      "Seven hands-on cybersecurity investigations, with commands, evidence, findings, and lessons learned from an authorized lab.",
    image: "/artwork/seven-tools-seven-days-emblem.svg",
    imageAlt: "7 Tools in 7 Days geometric seven emblem",
    overview: [
      {
        text: "Cybersecurity is a field where understanding comes from more than simply knowing how a tool works. It comes from experimenting, asking questions, and discovering what happens when theory meets practice.",
      },
      {
        text: "7 Tools in 7 Days is a hands-on cybersecurity challenge built around exploring seven different security tools through practical exercises. Each day introduces another opportunity to move beyond familiarity and develop understanding through experience.",
        emphasis: "7 Tools in 7 Days",
      },
      {
        text: "At its heart, the project reflects a simple belief: knowledge becomes far more valuable when it is put into practice. Sometimes, the best way to understand something is to stop reading about it and start exploring it.",
      },
    ],
    links: [{ label: "View on GitHub", href: "https://github.com/mr-vitamin/7-tools-7-days" }],
  },
  {
    id: "wren-discord-bot",
    slug: "wren-discord-bot",
    name: "Wren Discord Bot",
    category: "Software",
    status: "released",
    type: "Discord bot",
    order: 50,
    description:
      "A Discord bot for community quotes, editorial submission tracking, and issue participation.",
    image: "/artwork/wren-discord-bot-emblem.svg",
    imageAlt: "Wren geometric bird emblem",
    overview: [
      {
        text: "Writing communities are built around shared stories, creative collaboration, and the people who bring them to life. But behind those communities are countless small responsibilities that can draw attention away from the writing itself.",
      },
      {
        text: "Wren is an independent Discord bot designed with writing communities in mind. Its purpose is to simplify community management through focused automation, allowing organizers to spend less time on repetitive administrative tasks and more time supporting their members.",
      },
      {
        text: "Rather than attempting to become another all-purpose Discord bot, Wren is intended to provide practical tools tailored to the needs of communities centered around writing and creative collaboration.",
      },
    ],
    links: [{ label: "View on GitHub", href: "https://github.com/mr-vitamin/wren-discord-bot" }],
  },
  {
    id: "vtmn-website",
    slug: "vtmn-website",
    name: "VTMN Website",
    category: "Website",
    status: "released",
    type: "Personal portfolio website",
    order: 60,
    description:
      "A personal website and archive bringing creative writing, software, and cybersecurity projects together under VTMN.",
    image: "/artwork/vtmn-website-emblem.svg",
    imageAlt: "VTMN geometric symbol",
    overview: [
      {
        text: "Not every idea begins with a clear destination. Some grow into larger projects, others take unexpected turns, and a few become something entirely different from what was first imagined.",
      },
      {
        text: "VTMN was created to give those ideas a place to belong. Bringing together technical projects, creative work, and future ambitions under one identity, it offers a home for ideas that don't necessarily fit into a single category.",
      },
      {
        text: "More than a conventional portfolio, the website is intended to become a permanent record of that work: a collection of what has been created, what is still taking shape, and what may come next.",
      },
    ],
    links: [{ label: "Visit website", href: "https://vtmnarchive.com" }],
  },
];

function compareProjects(a: Project, b: Project) {
  return a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** Each record appears once; status and display order always come from data. */
export function getArchiveGroups(list: readonly Project[] = projects) {
  const sorted = [...list].sort(compareProjects);
  return {
    upcoming: sorted.filter((p) => p.status === "upcoming"),
    released: sorted.filter((p) => p.status === "released"),
  };
}

export function getProjectBySlug(slug: string, list: readonly Project[] = projects) {
  return list.find((p) => p.slug === slug);
}

/** Shared destination for card navigation and static prerender enumeration. */
export function getProjectPath(project: Pick<Project, "slug">) {
  return "/archive/" + encodeURIComponent(project.slug);
}

export function getProjectPages(list: readonly Project[] = projects) {
  return [...list].sort(compareProjects).map((project) => ({ path: getProjectPath(project) }));
}

export function filterProjects(list: readonly Project[], category: Category | "All") {
  return category === "All" ? [...list] : list.filter((p) => p.category === category);
}

export function getFeatured(list: readonly Project[] = projects, limit = 4) {
  return list.filter((p) => p.featured && p.status === "released").slice(0, limit);
}

export function getUpcomingBooks(list: readonly Project[] = projects) {
  return [...list]
    .filter((p) => p.category === "Literature" && p.status === "upcoming")
    .sort(compareProjects);
}

/** Series remains catalog metadata; the exhibition does not duplicate its books. */
export function groupSeries(list: readonly Project[] = projects) {
  const map = new Map<string, Project[]>();
  for (const project of list) {
    if (!project.series) continue;
    map.set(project.series.title, [...(map.get(project.series.title) ?? []), project]);
  }
  for (const books of map.values())
    books.sort(
      (a, b) => (a.series?.order ?? 99) - (b.series?.order ?? 99) || compareProjects(a, b),
    );
  return map;
}

export function getSpotlight(list: readonly Project[] = projects) {
  return list.find((p) => p.spotlight && p.status === "upcoming" && p.category !== "Literature");
}

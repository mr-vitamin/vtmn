import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  projects,
  filterProjects,
  getArchiveGroups,
  getProjectBySlug,
  getProjectPath,
  getProjectPages,
  getSpotlight,
  groupSeries,
  getUpcomingBooks,
  type Project,
} from "@/data/projects";

const fixture = (id: string, status: Project["status"], order: number): Project => ({
  id,
  slug: id,
  name: id,
  category: "Software",
  status,
  order,
  type: "Technical project",
  description: "A project used to exercise catalog ordering.",
});

describe("Archive catalog", () => {
  it("contains six real catalog entries with unique, usable identifiers and slugs", () => {
    expect(projects).toHaveLength(6);
    expect(new Set(projects.map((p) => p.id)).size).toBe(6);
    expect(new Set(projects.map((p) => p.slug)).size).toBe(6);
    for (const project of projects) {
      expect(project.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(project.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(CATEGORIES).toContain(project.category);
      expect(["released", "upcoming"]).toContain(project.status);
      expect(project.type).toBeTruthy();
      expect(Number.isInteger(project.order)).toBe(true);
      expect(project.description.length).toBeGreaterThan(0);
      expect(project.description.length).toBeLessThanOrEqual(180);
      expect(project.name).not.toMatch(/Sample/);
    }
  });

  it("separates the three owner-confirmed releases from the three upcoming projects", () => {
    expect(getArchiveGroups().released.map((p) => p.id)).toEqual([
      "7-tools-7-days",
      "wren-discord-bot",
      "vtmn-website",
    ]);
    expect(getArchiveGroups().upcoming.map((p) => p.id)).toEqual([
      "shrouded-reign-book-1",
      "shrouded-reign-book-2",
      "wet-paper-website",
    ]);
  });

  it("groups and sorts by catalog status/order without mutating its input", () => {
    const input = [
      fixture("later", "released", 30),
      fixture("next", "upcoming", 20),
      fixture("earlier", "released", 10),
    ];
    const groups = getArchiveGroups(input);
    expect(groups.upcoming.map((p) => p.id)).toEqual(["next"]);
    expect(groups.released.map((p) => p.id)).toEqual(["earlier", "later"]);
    expect(input.map((p) => p.id)).toEqual(["later", "next", "earlier"]);
  });

  it("uses stable identifiers to break ordering ties", () => {
    expect(
      getArchiveGroups([
        fixture("zeta", "upcoming", 10),
        fixture("alpha", "upcoming", 10),
      ]).upcoming.map((p) => p.id),
    ).toEqual(["alpha", "zeta"]);
  });

  it("finds a project by slug and prepares its internal path without creating routes", () => {
    const book = getProjectBySlug("the-shrouded-reign-book-1");
    expect(book?.id).toBe("shrouded-reign-book-1");
    expect(getProjectBySlug("missing-project")).toBeUndefined();
    expect(getProjectPath(fixture("example-project", "upcoming", 1))).toBe(
      "/archive/example-project",
    );
  });

  it("preserves category filtering as a catalog helper", () => {
    expect(filterProjects(projects, "Literature").map((p) => p.id)).toEqual([
      "shrouded-reign-book-1",
      "shrouded-reign-book-2",
    ]);
    expect(filterProjects(projects, "All")).toHaveLength(6);
    expect(filterProjects(projects, "Artificial Intelligence")).toEqual([]);
    expect(filterProjects(projects, "Website").map((p) => p.id)).toEqual([
      "wet-paper-website",
      "vtmn-website",
    ]);
  });

  it("enumerates ordered static paths for a future catalog without changing route components", () => {
    const input = [
      fixture("later-project", "upcoming", 20),
      fixture("new-project", "released", 10),
    ];
    expect(getProjectPages(input)).toEqual([
      { path: "/archive/new-project" },
      { path: "/archive/later-project" },
    ]);
    expect(input[0]?.id).toBe("later-project");
  });

  it("keeps book-series ordering and multiple upcoming books without a separate page section", () => {
    const books = groupSeries([...projects].reverse()).get("The Shrouded Reign");
    expect(books?.map((p) => p.series?.order)).toEqual([1, 2]);
    expect(getUpcomingBooks().map((p) => p.id)).toEqual([
      "shrouded-reign-book-1",
      "shrouded-reign-book-2",
    ]);
    expect(getSpotlight()?.category).not.toBe("Literature");
  });
});

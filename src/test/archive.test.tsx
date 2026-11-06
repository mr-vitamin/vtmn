import { cleanup, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/archive";
import * as catalog from "@/data/projects";
import { renderWithRouter } from "@/test/render-with-router";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const Archive = Route.options.component!;

describe("Archive exhibition", () => {
  it("uses Upcoming-specific empty text when a future catalog contains only Released projects", async () => {
    vi.spyOn(catalog, "getArchiveGroups").mockReturnValue({
      upcoming: [],
      released: catalog.projects.map((project) => ({ ...project, status: "released" })),
    });
    await renderWithRouter(<Archive />);
    expect(
      within(screen.getByRole("region", { name: "Upcoming" })).getByText(
        "No upcoming projects right now.",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Released" })).getAllByRole("article"),
    ).toHaveLength(6);
  });
  it("presents Upcoming before Released with one appearance of each project", async () => {
    await renderWithRouter(<Archive />);
    expect(screen.getByRole("heading", { level: 1, name: "The Archive" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Upcoming",
      "Released",
    ]);
    expect(screen.getAllByRole("article")).toHaveLength(6);
    const upcoming = screen.getByRole("region", { name: "Upcoming" });
    expect(
      within(upcoming)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual([
      "The Shrouded Reign — Book 1",
      "The Shrouded Reign — Book 2",
      "Wet Paper Magazine Website",
      "7 Tools in 7 Days",
      "Wren Discord Bot",
      "VTMN Website",
    ]);
  });

  it("shows an honest Released empty state and omits obsolete filter/series sections", async () => {
    await renderWithRouter(<Archive />);
    const released = screen.getByRole("region", { name: "Released" });
    expect(within(released).queryByRole("article")).not.toBeInTheDocument();
    expect(within(released).getByText("No released projects yet.")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Filter by category" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /Series|In Development/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Sample|9 entries and counting/)).not.toBeInTheDocument();
  });
});

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
    ).toEqual(["Bound by Ash and Fire", "Torn by Fate and Duty", "Wet Paper Magazine Website"]);
  });

  it("shows three released emblems, three upcoming placeholders and dynamic counts", async () => {
    await renderWithRouter(<Archive />);
    const released = screen.getByRole("region", { name: "Released" });
    expect(within(released).getAllByRole("article")).toHaveLength(3);
    expect(within(released).getAllByRole("img")).toHaveLength(3);
    expect(released.querySelector("[data-project-placeholder]")).toBeNull();
    const upcoming = screen.getByRole("region", { name: "Upcoming" });
    expect(upcoming.querySelectorAll("[data-project-placeholder]")).toHaveLength(3);
    for (const section of [upcoming, released]) {
      expect(within(section).getByLabelText("3 projects")).toHaveTextContent("03");
    }
    expect(screen.queryByRole("group", { name: "Filter by category" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /Series|In Development/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Sample|9 entries and counting/)).not.toBeInTheDocument();
  });
});

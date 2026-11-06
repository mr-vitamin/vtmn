import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectDetail } from "@/components/project-detail";
import { renderWithRouter } from "@/test/render-with-router";
import type { Project } from "@/data/projects";

afterEach(cleanup);
const project: Project = {
  id: "example",
  slug: "example",
  name: "Example exhibit",
  category: "Software",
  status: "upcoming",
  type: "Software project",
  order: 10,
  description: "Fallback overview.",
};

describe("Shared project exhibit", () => {
  it("groups the heading and first paragraph before the remaining two complete paragraphs", async () => {
    const { container } = await renderWithRouter(
      <ProjectDetail
        project={{
          ...project,
          overview: [
            { text: "The first complete paragraph." },
            { text: "The second complete paragraph." },
            { text: "The third complete paragraph." },
          ],
        }}
      />,
    );
    const panel = container.querySelector(".vtmn-exhibit-overview-panel");
    expect(panel).not.toBeNull();
    expect(panel?.children).toHaveLength(2);
    const left = panel!.children[0]!;
    const right = panel!.children[1]!;
    expect(left.querySelector("h2")?.textContent).toBe("Overview");
    expect([...left.querySelectorAll("p")].map((p) => p.textContent)).toEqual([
      "The first complete paragraph.",
    ]);
    expect([...right.querySelectorAll("p")].map((p) => p.textContent)).toEqual([
      "The second complete paragraph.",
      "The third complete paragraph.",
    ]);
    expect([...panel!.querySelectorAll("h2,p")].map((p) => p.textContent)).toEqual([
      "Overview",
      "The first complete paragraph.",
      "The second complete paragraph.",
      "The third complete paragraph.",
    ]);
  });

  it("uses the summary once when no expanded information exists, omitting absent sections", async () => {
    const { container } = await renderWithRouter(<ProjectDetail project={project} />);
    expect(screen.getAllByText("Fallback overview.")).toHaveLength(1);
    expect(container.querySelector("dl")).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Project links" })).not.toBeInTheDocument();
    expect(screen.queryByText("Part of the series")).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-project-placeholder][aria-hidden="true"]'),
    ).not.toBeNull();
  });

  it("renders ordered paragraphs, italic emphasis and verified links while omitting supplementary hero labels", async () => {
    const { container } = await renderWithRouter(
      <ProjectDetail
        project={{
          ...project,
          overview: [
            { text: "An expanded factual overview." },
            { text: "An italic title belongs here.", emphasis: "italic title" },
            { text: "A concluding paragraph." },
          ],
          series: { title: "A series", order: 1 },
          links: [
            { label: "View on GitHub", href: "https://github.com/mr-vitamin/7-tools-7-days" },
          ],
        }}
      />,
    );
    expect(screen.getByText("An expanded factual overview.")).toBeInTheDocument();
    expect(screen.queryByText("Fallback overview.")).not.toBeInTheDocument();
    expect(
      [...container.querySelectorAll(".vtmn-exhibit-copy > p")].map((p) => p.textContent),
    ).toEqual([
      "An expanded factual overview.",
      "An italic title belongs here.",
      "A concluding paragraph.",
    ]);
    expect(container.querySelector("em")?.textContent).toBe("italic title");
    expect(container.querySelector("dl")).toBeNull();
    expect(screen.queryByText("A series")).not.toBeInTheDocument();
    expect(screen.queryByText("Software project")).not.toBeInTheDocument();
    const link = screen.getByRole("link", { name: "View on GitHub (opens in a new tab)" });
    expect(link).toHaveAttribute("href", "https://github.com/mr-vitamin/7-tools-7-days");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("prefers authentic hero artwork and preserves its image description and dimensions", async () => {
    const { container } = await renderWithRouter(
      <ProjectDetail
        project={{
          ...project,
          image: "/cover.jpg",
          imageAlt: "Card artwork",
          heroImage: "/hero.jpg",
          heroImageAlt: "Authentic hero artwork",
        }}
      />,
    );
    const image = screen.getByAltText("Authentic hero artwork");
    expect(image).toHaveAttribute("src", "/hero.jpg");
    expect(image).toHaveAttribute("width", "960");
    expect(image).toHaveAttribute("height", "600");
    expect(container.querySelector("[data-project-placeholder]")).toBeNull();
  });
});

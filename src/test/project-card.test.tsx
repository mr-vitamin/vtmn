import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectCard } from "@/components/project-card";
import type { Project } from "@/data/projects";
import { renderWithRouter } from "@/test/render-with-router";

afterEach(cleanup);
const project: Project = {
  id: "example-project",
  slug: "example-project",
  name: "Example Project",
  category: "Software",
  status: "upcoming",
  type: "Technical project",
  order: 10,
  description: "A concise factual description.",
};

describe("Exhibition project card", () => {
  it("renders its catalog title, category, status and description without invented metadata", async () => {
    await renderWithRouter(<ProjectCard project={project} />);
    expect(screen.getByRole("heading", { level: 3, name: "Example Project" })).toBeInTheDocument();
    expect(screen.getByText("Software")).toBeInTheDocument();
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.getByText("A concise factual description.")).toBeInTheDocument();
    expect(screen.queryByText(/Sample entry|Anticipated|Released 20/)).not.toBeInTheDocument();
  });

  it("makes the whole card a keyboard-discoverable internal link", async () => {
    const { container } = await renderWithRouter(<ProjectCard project={project} />);
    const action = screen.getByRole("link", { name: /View Project: Example Project/i });
    expect(action).toHaveAttribute("href", "/archive/example-project");
    expect(action).not.toHaveAttribute("aria-disabled");
    expect(action).not.toHaveAttribute("target");
    action.focus();
    expect(action).toHaveFocus();
    expect(container.querySelectorAll("a[href]")).toHaveLength(1);
    expect(screen.queryByText("Project page coming soon.")).not.toBeInTheDocument();
    expect(screen.getByText("View Project")).toBeInTheDocument();
  });

  it("uses decorative local placeholder artwork when no official image exists", async () => {
    const { container } = await renderWithRouter(<ProjectCard project={project} />);
    expect(
      container.querySelector('svg[data-project-placeholder][aria-hidden="true"]'),
    ).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("accepts authentic artwork unchanged in place of the placeholder", async () => {
    const { container } = await renderWithRouter(
      <ProjectCard
        project={{
          ...project,
          image: "/artwork/example.jpg",
          imageAlt: "Official project artwork",
        }}
      />,
    );
    expect(screen.getByAltText("Official project artwork")).toHaveAttribute(
      "src",
      "/artwork/example.jpg",
    );
    expect(container.querySelector("[data-project-placeholder]")).toBeNull();
  });
});

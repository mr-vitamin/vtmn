import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { afterEach, describe, expect, it } from "vitest";
import { getRouter } from "@/router";
import { approvedOverviews } from "@/test/fixtures/approved-project-overviews";

afterEach(cleanup);

async function visit(path: string) {
  const router = getRouter();
  router.update({
    history: createMemoryHistory({ initialEntries: [path] }),
    context: router.options.context!,
  });
  await act(() => router.load());
  render(<RouterProvider router={router} />);
  return router;
}

describe("Project exhibit routes", () => {
  it.each([
    ["the-shrouded-reign-book-1", "The Shrouded Reign — Book 1"],
    ["the-shrouded-reign-book-2", "The Shrouded Reign — Book 2"],
    ["wet-paper-magazine-website", "Wet Paper Magazine Website"],
    ["7-tools-in-7-days", "7 Tools in 7 Days"],
    ["wren-discord-bot", "Wren Discord Bot"],
    ["vtmn-website", "VTMN Website"],
  ])("renders %s as its own exhibit", async (slug, title) => {
    await visit("/archive/" + slug);
    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    const main = screen.getByRole("main");
    const hero = main.querySelector(".vtmn-exhibit-hero")!;
    const identity = hero.querySelector(".vtmn-exhibit-identity")!;
    expect([...identity.children].map((element) => element.tagName)).toEqual(["DIV", "H1"]);
    expect(identity.children[0]).toHaveClass("vtmn-exhibit-metadata");
    expect(identity.querySelector("p")).toBeNull();
    expect(hero.children[1]).toHaveClass("vtmn-exhibit-artwork");
    expect(within(main).getByText("Upcoming")).toBeInTheDocument();
    expect(within(main).getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    const expected = approvedOverviews[slug as keyof typeof approvedOverviews];
    const paragraphs = [...main.querySelectorAll(".vtmn-exhibit-copy > p")];
    expect(paragraphs.map((p) => p.textContent)).toEqual(expected.map((p) => p.text));
    expect(
      paragraphs.map((p) => [...p.querySelectorAll("em")].map((em) => em.textContent)),
    ).toEqual(expected.map((p) => ("emphasis" in p ? [p.emphasis] : [])));
    expect(main.querySelector("dl")).toBeNull();
    expect(main).not.toHaveTextContent("Alexander Ceran");
    if (slug === "wren-discord-bot") expect(main).not.toHaveTextContent("Wet Paper Magazine");
    expect(within(main).getByRole("link", { name: "Back to The Archive" })).toHaveAttribute(
      "href",
      "/archive",
    );
    expect(within(main).queryByText("Project page coming soon.")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /entrance/i })).not.toBeInTheDocument();
  });

  it("opens a real project from its whole-card link and returns to the collection", async () => {
    const router = await visit("/archive");
    fireEvent.click(await screen.findByRole("link", { name: "View Project: Wren Discord Bot" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Wren Discord Bot" }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/archive/wren-discord-bot");
    fireEvent.click(screen.getByRole("link", { name: "Back to The Archive" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "The Archive" }),
    ).toBeInTheDocument();
  });

  it("handles an unknown slug with a project-specific return link", async () => {
    await visit("/archive/not-a-real-project");
    expect(await screen.findByRole("heading", { name: "Project not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to The Archive" })).toHaveAttribute(
      "href",
      "/archive",
    );
  });
});

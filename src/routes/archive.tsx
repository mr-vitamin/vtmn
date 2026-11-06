import { createFileRoute } from "@tanstack/react-router";
import { getArchiveGroups, type Project, type Status } from "@/data/projects";
import { ProjectCard } from "@/components/project-card";
import archiveCss from "@/styles/archive.css?url";

const description =
  "The VTMN collection of creative and technical projects, released and upcoming.";

export const Route = createFileRoute("/archive")({
  head: () => ({
    meta: [
      { title: "The Archive — VTMN" },
      { name: "description", content: description },
      { property: "og:title", content: "The Archive — VTMN" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/archive" },
    ],
    links: [
      { rel: "canonical", href: "/archive" },
      { rel: "stylesheet", href: archiveCss },
    ],
  }),
  component: Archive,
});

function Archive() {
  const groups = getArchiveGroups();
  return (
    <div className="vtmn-archive mx-auto max-w-6xl px-5">
      <header className="vtmn-archive-introduction">
        <p className="vtmn-label text-accent-glow">Permanent collection</p>
        <h1 className="vtmn-page-title">The Archive</h1>
        <p className="vtmn-archive-description">
          Creative and technical work, collected in one place.
        </p>
      </header>
      <ProjectGroup status="upcoming" title="Upcoming" items={groups.upcoming} />
      <ProjectGroup status="released" title="Released" items={groups.released} />
    </div>
  );
}

function ProjectGroup({
  status,
  title,
  items,
}: {
  status: Status;
  title: string;
  items: readonly Project[];
}) {
  const heading = "archive-" + status;
  return (
    <section className="vtmn-archive-group" aria-labelledby={heading} data-archive-group={status}>
      <div className="vtmn-archive-section-heading">
        <h2 id={heading}>{title}</h2>
        <span className="vtmn-archive-count" aria-label={items.length + " projects"}>
          {String(items.length).padStart(2, "0")}
        </span>
        <span className="vtmn-archive-section-rail" aria-hidden="true" />
      </div>
      {items.length > 0 ? (
        <div className="vtmn-archive-grid">
          {items.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="vtmn-archive-empty">
          <p>
            {status === "released"
              ? "No released projects yet."
              : "No upcoming projects right now."}
          </p>
          <p>
            {status === "released"
              ? "Completed and published work will appear here."
              : "Future additions to the collection will appear here."}
          </p>
        </div>
      )}
    </section>
  );
}

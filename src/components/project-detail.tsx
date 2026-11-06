import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ProjectArtwork } from "@/components/project-artwork";
import type { Project, ProjectOverviewParagraph } from "@/data/projects";

function OverviewParagraph({ paragraph }: { paragraph: ProjectOverviewParagraph }) {
  const position = paragraph.emphasis ? paragraph.text.indexOf(paragraph.emphasis) : -1;
  return (
    <p className="vtmn-exhibit-lead">
      {position < 0 || !paragraph.emphasis ? (
        paragraph.text
      ) : (
        <>
          {paragraph.text.slice(0, position)}
          <em>{paragraph.emphasis}</em>
          {paragraph.text.slice(position + paragraph.emphasis.length)}
        </>
      )}
    </p>
  );
}

export function ProjectDetail({ project }: { project: Project }) {
  const image = project.heroImage ?? project.image;
  const imageAlt = project.heroImage ? project.heroImageAlt : project.imageAlt;
  const paragraphs = project.overview ?? [{ text: project.description }];
  return (
    <article className="vtmn-exhibit mx-auto max-w-6xl px-5" data-project-exhibit={project.id}>
      <Button asChild variant="link" className="vtmn-exhibit-return">
        <Link to="/archive">
          <ArrowLeft aria-hidden="true" />
          Back to The Archive
        </Link>
      </Button>

      <header className="vtmn-exhibit-hero">
        <div className="vtmn-exhibit-identity">
          <div className="vtmn-exhibit-metadata">
            <span className="vtmn-label">{project.category}</span>
            <span className="vtmn-exhibit-status" data-status={project.status}>
              <span aria-hidden="true" />
              {project.status === "upcoming" ? "Upcoming" : "Released"}
            </span>
          </div>
          <h1>{project.name}</h1>
        </div>
        <div className="vtmn-exhibit-artwork">
          {image ? (
            <img
              src={image}
              alt={imageAlt ?? ""}
              width={960}
              height={600}
              decoding="async"
              fetchPriority="high"
            />
          ) : (
            <ProjectArtwork variant={project.order % 3} />
          )}
        </div>
      </header>

      <section className="vtmn-exhibit-overview" aria-labelledby="project-overview">
        <div className="vtmn-exhibit-overview-panel">
          <div className="vtmn-exhibit-copy">
            <h2 id="project-overview">Overview</h2>
            {paragraphs[0] && <OverviewParagraph paragraph={paragraphs[0]} />}
          </div>
          {(paragraphs.length > 1 || !!project.links?.length) && (
            <div className="vtmn-exhibit-reading">
              <div className="vtmn-exhibit-copy">
                {paragraphs.slice(1).map((paragraph, index) => (
                  <OverviewParagraph key={index} paragraph={paragraph} />
                ))}
              </div>
              {!!project.links?.length && (
                <nav className="vtmn-exhibit-links" aria-label="Project links">
                  {project.links.map((link) => (
                    <Button
                      asChild
                      key={link.href}
                      variant="outline"
                      className="vtmn-exhibit-external"
                    >
                      <a href={link.href} target="_blank" rel="noopener noreferrer">
                        {link.label}
                        <ArrowUpRight aria-hidden="true" />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </Button>
                  ))}
                </nav>
              )}
            </div>
          )}
        </div>
      </section>
    </article>
  );
}

export function ProjectNotFound() {
  return (
    <section className="vtmn-exhibit vtmn-exhibit-missing mx-auto max-w-6xl px-5">
      <p className="vtmn-label">The Archive / 404</p>
      <h1 className="vtmn-page-title">Project not found</h1>
      <p>This project isn’t part of the collection.</p>
      <Button asChild variant="outline">
        <Link to="/archive">
          <ArrowLeft aria-hidden="true" />
          Back to The Archive
        </Link>
      </Button>
    </section>
  );
}

import { ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { getProjectPath, type Project } from "@/data/projects";
import { ProjectArtwork } from "@/components/project-artwork";

export function StatusBadge({ status }: { status: Project["status"] }) {
  return (
    <span className="vtmn-project-status" data-status={status}>
      <span aria-hidden="true" />
      {status === "upcoming" ? "Upcoming" : "Released"}
    </span>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  const titleId = "project-title-" + project.id;
  return (
    <article
      className="vtmn-project-card"
      aria-labelledby={titleId}
      data-project-id={project.id}
      data-project-path={getProjectPath(project)}
    >
      <div className="vtmn-project-shell">
        <div className="vtmn-project-artwork">
          {project.image ? (
            <img
              src={project.image}
              alt={project.imageAlt ?? ""}
              width={640}
              height={400}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <ProjectArtwork variant={project.order % 3} />
          )}
        </div>
        <div className="vtmn-project-content">
          <div className="vtmn-project-metadata">
            <span className="vtmn-project-category">{project.category}</span>
            <StatusBadge status={project.status} />
          </div>
          <h3 id={titleId} className="vtmn-card-title">
            {project.name}
          </h3>
          <p className="vtmn-project-description">{project.description}</p>
          <div className="vtmn-project-footer">
            <span className="vtmn-project-cue" aria-hidden="true">
              View Project <ArrowUpRight size={16} aria-hidden="true" />
            </span>
            <span className="vtmn-project-footer-space" aria-hidden="true" />
          </div>
        </div>
      </div>
      <Button asChild variant="ghost" className="vtmn-project-trigger">
        <Link
          to="/archive/$slug"
          params={{ slug: project.slug }}
          aria-label={"View Project: " + project.name}
        />
      </Button>
    </article>
  );
}

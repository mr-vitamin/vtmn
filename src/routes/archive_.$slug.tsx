import { createFileRoute, notFound } from "@tanstack/react-router";
import { getProjectBySlug, getProjectPath } from "@/data/projects";
import { ProjectDetail, ProjectNotFound } from "@/components/project-detail";
import archiveCss from "@/styles/archive.css?url";
import exhibitCss from "@/styles/project-detail.css?url";

export const Route = createFileRoute("/archive_/$slug")({
  loader: ({ params }) => {
    const project = getProjectBySlug(params.slug);
    if (!project) throw notFound();
    return project;
  },
  head: ({ loaderData: project }) => ({
    meta: project
      ? [
          { title: project.name + " — VTMN" },
          { name: "description", content: project.overview?.[0]?.text ?? project.description },
          { property: "og:title", content: project.name + " — VTMN" },
          {
            property: "og:description",
            content: project.overview?.[0]?.text ?? project.description,
          },
          { property: "og:url", content: getProjectPath(project) },
        ]
      : [{ title: "Project not found — VTMN" }, { name: "robots", content: "noindex" }],
    links: [
      ...(project ? [{ rel: "canonical", href: getProjectPath(project) }] : []),
      { rel: "stylesheet", href: archiveCss },
      { rel: "stylesheet", href: exhibitCss },
    ],
  }),
  component: ProjectRoute,
  notFoundComponent: ProjectNotFound,
});

function ProjectRoute() {
  return <ProjectDetail project={Route.useLoaderData()} />;
}

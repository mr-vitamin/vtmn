import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/wordmark";
import { ArchitecturalFrame } from "@/components/architectural-frame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VTMN — Independent Ideas & Creative Work" },
      { name: "description", content: "From digital systems to imagined worlds, VTMN brings independent ideas to life." },
      { property: "og:title", content: "VTMN | Esse Quam Videri" },
      { property: "og:description", content: "An independent collection of projects spanning technology, literature, and creative work. Built to create, explore, and document." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "VTMN | Esse Quam Videri" },
      { name: "twitter:description", content: "An independent collection of projects spanning technology, literature, and creative work. Built to create, explore, and document." },
      { property: "og:url", content: "https://vtmnarchive.com/" },
      { property: "og:image", content: "https://vtmnarchive.com/vtmn-social-preview.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "VTMN horizontal lockup with its emblem, wordmark, and Esse Quam Videri motto on a dark background." },
      { name: "twitter:image", content: "https://vtmnarchive.com/vtmn-social-preview.png" },
      { name: "twitter:image:alt", content: "VTMN horizontal lockup with its emblem, wordmark, and Esse Quam Videri motto on a dark background." },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Home,
});

function Home() {
  return (
    <section className="vtmn-home-hero relative flex items-center overflow-hidden bg-background">
      <div className="mx-auto w-full max-w-6xl px-5 pb-20 pt-32 md:pb-24 md:pt-36">
        <div className="relative py-6 sm:px-8 sm:py-10 md:px-12 md:py-12">
          <ArchitecturalFrame />
          <h1 aria-label="VTMN" className="text-foreground">
            <BrandLockup />
          </h1>
          <p aria-hidden="true" className="vtmn-label text-center text-muted-foreground sm:hidden">Esse Quam Videri</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 sm:mt-8">
            <Button asChild size="lg" className="group h-12 shadow-glow">
              <Link to="/archive">Explore the Archive <ArrowRight size={18} aria-hidden="true" className="transition-transform motion-safe:group-hover:translate-x-1" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 text-foreground">
              <Link to="/about">Behind VTMN <ArrowRight size={18} aria-hidden="true" /></Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

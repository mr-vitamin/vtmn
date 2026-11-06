import { createFileRoute } from "@tanstack/react-router";
import portrait from "@/assets/alexander-ceran-portrait.jpg";
import aboutCss from "@/styles/about.css?url";

const description =
  "Behind VTMN: Alexander Ceran, the independent creator behind Mr Vitamin, and the philosophy of Esse Quam Videri.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — VTMN" },
      { name: "description", content: description },
      { property: "og:title", content: "About — VTMN" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/about" },
    ],
    links: [
      { rel: "canonical", href: "/about" },
      { rel: "stylesheet", href: aboutCss },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="vtmn-about mx-auto max-w-6xl px-5">
      <section aria-labelledby="founder-heading" className="vtmn-about-introduction">
        <div className="vtmn-about-portrait">
          <div className="vtmn-about-portrait-window">
            <img
              src={portrait}
              alt="Portrait of Alexander Ceran, the creator behind VTMN"
              width={1327}
              height={1185}
              decoding="async"
              fetchPriority="high"
              className="vtmn-about-photo"
            />
          </div>
        </div>
        <div className="vtmn-about-panel vtmn-about-biography">
          <h1 id="founder-heading" className="vtmn-about-title">
            Behind VTMN
          </h1>
          <div className="vtmn-about-copy vtmn-about-biography-copy">
            <p>
              Some people are content to follow a single path. Alexander Ceran has always been more
              interested in discovering where the others might lead.
            </p>
            <p>
              A United States Marine Corps veteran, aspiring cybersecurity professional, and writer,
              Alexander's interests have carried him between two seemingly different worlds: one
              built on logic, systems, and the pursuit of understanding, and another shaped by
              imagination, characters, and stories yet to be told.
            </p>
            <p>
              To him, the distance between those worlds is smaller than it appears. Both begin with
              curiosity. Both demand patience. And both offer the opportunity to create something
              that did not exist before.
            </p>
            <p>
              His work is an expression of that curiosity, whether it takes the form of a technical
              project, a new idea, or the pages of a novel.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="brand-heading" className="vtmn-about-panel vtmn-about-brand">
        <div className="vtmn-about-brand-lead">
          <h2 id="brand-heading" className="vtmn-about-secondary-title">
            About VTMN
          </h2>
          <p>
            Not every idea belongs in the same category. That doesn't mean they can't share a home.
          </p>
        </div>
        <div className="vtmn-about-copy vtmn-about-brand-copy">
          <p>
            VTMN takes its name from Mr Vitamin, the online identity adopted by Alexander Ceran.
            What began as a name became a way of bringing his work together without forcing it into
            a single direction.
          </p>
          <p>
            The Archive is a record of that journey. Some entries represent finished work, while
            others offer a glimpse of what may come next. Together, they tell a story that is still
            being written.
          </p>
        </div>
      </section>

      <section aria-labelledby="motto-heading" className="vtmn-about-motto">
        <div className="vtmn-about-panel vtmn-about-motto-panel">
          <div className="vtmn-about-motto-heading">
            <h2 id="motto-heading" className="vtmn-about-secondary-title">
              Esse Quam Videri
            </h2>
            <p className="vtmn-about-translation">
              <em>To be rather than to seem.</em>
            </p>
            <div className="vtmn-about-copy vtmn-about-philosophy-lead">
              <p>
                There is a difference between appearing to be something and becoming it. One asks
                only to be seen. The other demands patience, effort, and the willingness to continue
                when no one is watching.
              </p>
              <p>
                <em>Esse Quam Videri</em> is the philosophy at the heart of VTMN. It is a reminder
                that identity is not defined by what someone claims to be, but by what they choose
                to do. Ambition means little without action, just as an idea remains only an idea
                until someone is willing to bring it into the world.
              </p>
            </div>
          </div>
          <div className="vtmn-about-copy vtmn-about-philosophy">
            <p>
              For Alexander, the motto is not a declaration of achievement. It is a standard to work
              toward. Every project completed, every lesson learned, and every page written becomes
              part of that pursuit.
            </p>
            <p>
              The goal is not to appear accomplished, creative, or capable. It is to become those
              things through the work itself.
            </p>
            <p>
              And perhaps that is what VTMN represents above all else: not a finished portrait of
              who someone is, but an evolving record of who they are becoming.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

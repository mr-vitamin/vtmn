import { createFileRoute } from "@tanstack/react-router";

const description =
  "Terms for visiting VTMN, including software licenses, reserved creative work and external links.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [{ title: "Terms of Use — VTMN" }, { name: "description", content: description }],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsOfUse,
});

function TermsOfUse() {
  return (
    <article className="mx-auto max-w-3xl px-5 pb-20 pt-28 text-foreground">
      <h1 className="vtmn-page-title">Terms of Use</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Effective upon publication · Updated November 6, 2026
      </p>
      <div className="mt-10 space-y-8 leading-relaxed">
        <section aria-labelledby="terms-purpose">
          <h2 id="terms-purpose" className="vtmn-subheading">
            Purpose of this portfolio
          </h2>
          <p className="mt-3">
            VTMN is Alexander Ceran&apos;s personal portfolio of creative and technical work. These
            terms explain website use and the distinction between openly licensed software and
            reserved creative materials. Viewing this website alone does not establish agreement to
            every provision or waive rights provided by law.
          </p>
        </section>
        <section aria-labelledby="terms-access">
          <h2 id="terms-access" className="vtmn-subheading">
            Access and acceptable use
          </h2>
          <p className="mt-3">
            You are welcome to browse the portfolio and follow its links. Use the website lawfully.
            Do not disrupt its operation, introduce malicious code, attempt unauthorized access, or
            falsely represent an affiliation with VTMN. These expectations do not restrict activity
            permitted by applicable law or the software licenses described below.
          </p>
        </section>
        <section aria-labelledby="terms-ownership">
          <h2 id="terms-ownership" className="vtmn-subheading">
            Intellectual property and ownership
          </h2>
          <p className="mt-3">
            Original VTMN materials belong to Alexander Ceran unless otherwise identified.
            Third-party materials belong to their respective rights holders. Public display or
            access to a source repository does not transfer ownership. Specific licenses,
            permissions and rights provided by law determine how material may be reused.
          </p>
        </section>
        <section aria-labelledby="terms-software">
          <h2 id="terms-software" className="vtmn-subheading">
            Open-source software
          </h2>
          <p className="mt-3">
            Original VTMN software code expressly released under the{" "}
            <a
              className="underline underline-offset-4"
              href="https://www.apache.org/licenses/LICENSE-2.0"
            >
              Apache License 2.0
            </a>{" "}
            may be used, modified and redistributed under that license. Refer to the LICENSE and
            NOTICE supplied with the source. This page does not add conditions to that grant or
            narrow existing third-party licenses. Those licenses govern the materials they cover.
          </p>
        </section>
        <section aria-labelledby="terms-reserved">
          <h2 id="terms-reserved" className="vtmn-subheading">
            Reserved VTMN content
          </h2>
          <p className="mt-3">
            VTMN branding, logos, original artwork, photographs, literary content, project
            descriptions and other identified reserved materials remain All Rights Reserved. The
            software license does not automatically license those materials, including reserved
            artwork embedded in code. Reuse requires the rights holder&apos;s permission unless a
            separate license, express permission, applicable law or relevant hosting platform terms
            already authorize it. The footer copyright notice does not override Apache 2.0 or any
            other existing license.
          </p>
        </section>
        <section aria-labelledby="terms-external">
          <h2 id="terms-external" className="vtmn-subheading">
            External websites
          </h2>
          <p className="mt-3">
            External links lead to independently operated services. Their content, security,
            availability and privacy practices are outside VTMN&apos;s control. A link does not by
            itself imply endorsement or responsibility for the linked service.
          </p>
        </section>
        <section aria-labelledby="terms-projects">
          <h2 id="terms-projects" className="vtmn-subheading">
            Projects and availability
          </h2>
          <p className="mt-3">
            Project descriptions may include work in progress or planned releases. Features,
            availability and anticipated release dates are estimates, not guaranteed commitments.
            Descriptions and plans may change. A listing does not by itself promise a finished
            product, continuing support or availability for purchase.
          </p>
        </section>
        <section aria-labelledby="terms-limitations">
          <h2 id="terms-limitations" className="vtmn-subheading">
            Disclaimers and limitations
          </h2>
          <p className="mt-3">
            Information may contain errors or become outdated. The website is provided as available,
            without a promise of uninterrupted access or suitability for a particular purpose. To
            the extent permitted by applicable law, VTMN disclaims implied warranties and liability
            for losses arising from use of the website. Nothing here excludes liability that cannot
            legally be excluded or limits mandatory legal rights. Software warranties and liability
            remain governed by the applicable software license.
          </p>
        </section>
        <section aria-labelledby="terms-contact">
          <h2 id="terms-contact" className="vtmn-subheading">
            Contact and privacy
          </h2>
          <p className="mt-3">
            Send questions about these terms or reuse permissions to{" "}
            <a className="underline underline-offset-4" href="mailto:alexanderceran1@gmail.com">
              alexanderceran1@gmail.com
            </a>
            . For website data practices and privacy requests, see the{" "}
            <a className="underline underline-offset-4" href="/privacy">
              Privacy Policy
            </a>
            .
          </p>
        </section>
        <section aria-labelledby="terms-updates">
          <h2 id="terms-updates" className="vtmn-subheading">
            Effective date and updates
          </h2>
          <p className="mt-3">
            This notice takes effect when published on vtmnarchive.com. Future revisions will
            identify their update date on this page. Updates do not retroactively narrow software
            licenses already granted or remove rights protected by applicable law.
          </p>
        </section>
      </div>
    </article>
  );
}

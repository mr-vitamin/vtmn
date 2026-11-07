import { createFileRoute } from "@tanstack/react-router";

const description = "How VTMN handles website delivery, analytics and voluntary correspondence.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [{ title: "Privacy Policy — VTMN" }, { name: "description", content: description }],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyNotice,
});

function PrivacyNotice() {
  return (
    <article className="mx-auto max-w-3xl px-5 pb-20 pt-28 text-foreground">
      <h1 className="vtmn-page-title">Privacy Policy</h1>
      <p className="mt-4 text-sm text-muted-foreground">Updated November 6, 2026</p>
      <div className="mt-10 space-y-8 leading-relaxed">
        <p>
          VTMN is Alexander Ceran&apos;s personal portfolio, operated from Utah, USA. It presents
          creative and technical work. This website has no visitor accounts, registration, checkout,
          subscriptions or on-site contact form.
        </p>
        <section aria-labelledby="privacy-delivery">
          <h2 id="privacy-delivery" className="vtmn-subheading">
            Website delivery and security
          </h2>
          <p className="mt-3">
            Cloudflare hosts and protects the website. It processes connection and request
            information, such as IP addresses, browser information and requested URLs, to deliver
            pages, protect the service and diagnose problems. Its protections may use necessary
            security cookies, separate from traffic measurement.
          </p>
        </section>
        <section aria-labelledby="privacy-analytics">
          <h2 id="privacy-analytics" className="vtmn-subheading">
            Traffic and performance measurement
          </h2>
          <p className="mt-3">
            Cloudflare Web Analytics is enabled. It measures visits and website performance.
            Cloudflare describes it as privacy-first analytics that does not use tracking cookies or
            fingerprint visitors. Measurements can include page and referrer URLs, browser/device
            information and performance timings. Avoid putting sensitive information in URLs.
          </p>
          <p className="mt-3">
            See{" "}
            <a
              className="underline underline-offset-4"
              href="https://developers.cloudflare.com/speed/observatory/rum-beacon/"
            >
              Cloudflare&apos;s analytics and privacy information
            </a>{" "}
            and its{" "}
            <a
              className="underline underline-offset-4"
              href="https://www.cloudflare.com/privacypolicy/"
            >
              privacy policy
            </a>{" "}
            for its processing, retention and provider practices.
          </p>
        </section>
        <section aria-labelledby="privacy-contact">
          <h2 id="privacy-contact" className="vtmn-subheading">
            Email and retention
          </h2>
          <p className="mt-3">
            The Email link opens your email application. If you send a message, your address,
            message and attachments are processed through the email provider to handle the
            correspondence. Please do not send passwords or unnecessary sensitive information. I
            retain correspondence only as long as reasonably necessary for communication, follow-up
            or legitimate recordkeeping, subject to applicable retention obligations.
          </p>
        </section>
        <section aria-labelledby="privacy-links">
          <h2 id="privacy-links" className="vtmn-subheading">
            External websites
          </h2>
          <p className="mt-3">
            Links to GitHub, Discord, LinkedIn and project websites lead to services with their own
            privacy practices. VTMN does not embed their social widgets or advertising trackers.
          </p>
        </section>
        <section aria-labelledby="privacy-requests">
          <h2 id="privacy-requests" className="vtmn-subheading">
            Privacy questions and deletion requests
          </h2>
          <p className="mt-3">
            Email{" "}
            <a className="underline underline-offset-4" href="mailto:alexanderceran1@gmail.com">
              alexanderceran1@gmail.com
            </a>{" "}
            with privacy questions or requests about information you have sent to VTMN. I personally
            review these requests and delete correspondence I control when appropriate, subject to
            applicable retention obligations. Identify the correspondence involved without sending
            additional sensitive information. I cannot promise deletion of records controlled by
            Cloudflare or other providers; their policies and request processes apply to those
            records.
          </p>
        </section>
      </div>
    </article>
  );
}

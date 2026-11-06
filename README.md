# VTMN

[vtmnarchive.com](https://vtmnarchive.com)

Source reference for VTMN's creative portfolio and project archive. Home, The Archive, About, and individual project exhibits retain the approved website. Electric Genesis provides the cinematic desktop introduction; mobile, reduced-motion, and deep-link visits reach the site directly.

This repository is maintained by the owner. Outside contributions are not being solicited. The official website is deployed separately; this source snapshot has no deployment integration.

## Local setup

Use Node.js 22.12 or newer and npm 11.19.1. Install the locked dependencies with npm ci. Do not use forced or legacy peer resolution.

```sh
npm ci
npm run dev
```

In Windows PowerShell, use npm.cmd if execution policy blocks npm.ps1. Open the local URL printed by Vite. Viewing the software does not grant deployment or redistribution rights to reserved artwork; see BRANDING.md.

## Build and checks

```sh
npm run typecheck
npm test
npm run build:static
npm run test:static
npm run preview:static -- --port 4174
```

The static build writes dist-static/ with nine prerendered pages, client assets, and genuine 404 documents. No production Node server, Pages Functions, or Worker entrypoint is required. The separate npm run build and npm run test:preview commands validate the local Node/Nitro preview.

Source, artwork, and dependencies are unchanged from the validated development snapshot. Existing full-lint debt remains: 134 Prettier errors and six React Refresh warnings. Formatting cleanup is intentionally excluded from this release. Seven known moderate dependency-audit entries share one development-only minimatch advisory; the validated production-only audit reported zero findings. See [the advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249). Audit results describe the review checkpoint and can change.

## Licensing and attribution

Original software code the owner has rights to license is available under [Apache License 2.0](LICENSE). [NOTICE](NOTICE) retains applicable attribution. Original VTMN branding and artwork, including identified visual artwork embedded in code, are separately **All Rights Reserved** under [BRANDING.md](BRANDING.md). No permission is granted to use the VTMN name, logo, or original artwork for unrelated brands or public deployments. Third-party terms remain applicable.

See [PROVENANCE.md](PROVENANCE.md) for the original scaffold and font attribution. This is a fresh source snapshot; it does not include private development history.

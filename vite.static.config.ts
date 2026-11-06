import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { getProjectPages } from "./src/data/projects";
import { serverImportProtection, sharedViteConfig } from "./vite.shared";

// Start's renderer runs at build time; only static files are deployed to Pages.
export default defineConfig({
  ...sharedViteConfig,
  plugins: [
    tailwindcss(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
      importProtection: serverImportProtection,
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: true,
        autoSubfolderIndex: false,
        crawlLinks: false,
        failOnError: true,
        concurrency: 1,
      },
      pages: [
        { path: "/" },
        { path: "/archive" },
        { path: "/about" },
        { path: "/privacy" },
        ...getProjectPages(),
      ],
    }),
    react(),
  ],
  preview: { host: "127.0.0.1" },
});

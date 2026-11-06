import { fileURLToPath } from "node:url";
import type { UserConfig } from "vite";

// Keep the existing CSS compiler and shared runtime instances in both builds.
export const sharedViteConfig = {
  css: { transformer: "lightningcss" },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
    ignoreOutdatedRequests: true,
  },
} satisfies UserConfig;

export const serverImportProtection = {
  behavior: "error" as const,
  client: { files: ["**/server/**"], specifiers: ["server-only"] },
};

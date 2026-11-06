import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import { serverImportProtection, sharedViteConfig } from "./vite.shared";

// Local development/Node preview. Cloudflare Pages uses build:static instead.
export default defineConfig(({ command, mode }) => ({
  ...sharedViteConfig,
  ...(command === "build" && mode === "development"
    ? {
        environments: {
          client: { define: { "process.env.NODE_ENV": JSON.stringify("development") } },
        },
        build: { rolldownOptions: { output: { keepNames: true } } },
      }
    : {}),
  plugins: [
    tailwindcss(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({ server: { entry: "server" }, importProtection: serverImportProtection }),
    ...(command === "build" ? [nitro({ preset: "node-server" })] : []),
    react(),
  ],
  server: { host: "127.0.0.1", port: 8080 },
}));

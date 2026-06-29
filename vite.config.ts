import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function deferCssPlugin() {
  return {
    name: "defer-render-blocking-css",
    enforce: "post" as const,
    transformIndexHtml: {
      order: "post" as const,
      handler(html: string) {
        return html.replace(
          /<link rel="stylesheet"([^>]*) href="([^"]+\.css)"([^>]*)>/g,
          (_match, before, href, after) => {
            const attrs = `${before}${after}`.trim();
            const extraAttrs = attrs ? ` ${attrs}` : "";
            return [
              `<link rel="stylesheet"${extraAttrs} href="${href}" media="print" data-async-css>`,
              `<script>document.querySelectorAll('link[data-async-css]').forEach(function(link){function activate(){link.media='all'}if(link.sheet){activate()}else{link.addEventListener('load',activate,{once:true})}})</script>`,
              `<noscript><link rel="stylesheet"${extraAttrs} href="${href}"></noscript>`,
            ].join("");
          },
        );
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), deferCssPlugin()],
  root: path.resolve(__dirname, "client"),
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});

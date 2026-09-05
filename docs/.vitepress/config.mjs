import { defineConfig } from "vitepress";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { revealPlugin } from "./markdown-reveal.mjs";

// The sidebar is GENERATED from the catalogue, so an effect cannot ship
// undocumented and the nav can never drift from the library. PLAN.md §16.2
const catalogue = JSON.parse(
  readFileSync(new URL("../../dist/catalogue.json", import.meta.url), "utf8")
);

const GROUPS = {
  effects: "classic parity",
  atoms: "Composable atoms",
  scroll: "Scroll",
  surfaces: "Glass & shadow",
  fx: "Effects catalogue",
  vt: "View transitions",
  props: "Props & utilities",
  util: "Helpers",
};

const byGroup = {};
for (const [name, e] of Object.entries(catalogue.classes)) {
  const g = (e.module || "fx").split("/")[0];
  (byGroup[g] ||= []).push(name);
}

// `vitepress build` vs `vitepress dev`: the alias below has to resolve before
// the config is handed over, so there is no build-mode argument to read.
const IS_BUILD = process.argv.includes("build");

export default defineConfig({
  title: "Animatio",
  description:
    "CSS-only animation and effects library. 97 classic presets, composable atoms, scroll-driven reveals, glass surfaces, and tree-shaking.",
  lang: "en-GB",
  cleanUrls: true,
  lastUpdated: true,

  head: [
    // Geist rather than the VitePress default. Inter is the most over-used
    // face in developer tooling and reads as a template.
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    ["link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" }],
    [
      "link",
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap",
      },
    ],
    ["meta", { name: "theme-color", content: "#0092f9" }],

    // Icons generated from assets/icon.png by the pwa-generator; see
    // docs/public/head.html for the emitted set this mirrors.
    ["link", { rel: "icon", href: "/favicon.ico", sizes: "32x32" }],
    ["link", { rel: "icon", type: "image/png", sizes: "16x16", href: "/icons/favicon-16x16.png" }],
    ["link", { rel: "icon", type: "image/png", sizes: "32x32", href: "/icons/favicon-32x32.png" }],
    ["link", { rel: "icon", type: "image/png", sizes: "48x48", href: "/icons/favicon-48x48.png" }],
    ["link", { rel: "icon", type: "image/png", sizes: "96x96", href: "/icons/favicon-96x96.png" }],
    ["link", { rel: "apple-touch-icon", sizes: "120x120", href: "/icons/apple-touch-icon-120x120.png" }],
    ["link", { rel: "apple-touch-icon", sizes: "152x152", href: "/icons/apple-touch-icon-152x152.png" }],
    ["link", { rel: "apple-touch-icon", sizes: "167x167", href: "/icons/apple-touch-icon-167x167.png" }],
    ["link", { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" }],
    ["link", { rel: "manifest", href: "/manifest.webmanifest" }],
    ["meta", { name: "mobile-web-app-capable", content: "yes" }],
    ["meta", { name: "apple-mobile-web-app-title", content: "Animatio" }],
    ["meta", { name: "application-name", content: "Animatio" }],
    ["meta", { property: "og:image", content: "/brand/text-small.png" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "Animatio — CSS-only animation" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "97 classic presets, composable atoms, scroll-driven reveals, glass, and 392 classes in 20.6 KB — or 3.3 KB tree-shaken.",
      },
    ],
  ],

  themeConfig: {
    logo: { src: "/brand/icon.png", alt: "" },
    siteTitle: false,
    nav: [
      { text: "Guide", link: "/guide/" },
      { text: "Gallery", link: "/gallery" },
      { text: "Scroll lab", link: "/scroll-lab" },
      { text: "Surfaces", link: "/surfaces" },
      { text: "Compare", link: "/compare" },
      { text: "Limits", link: "/limits" },
    ],

    sidebar: {
      "/": [
        {
          text: "Getting started",
          items: [
            { text: "Introduction", link: "/guide/" },
            { text: "Install & tree-shaking", link: "/guide/install" },
            { text: "The prop API", link: "/guide/props" },
            { text: "Stagger", link: "/guide/stagger" },
          ],
        },
        {
          text: "Modules",
          items: [
            { text: "Parity presets", link: "/guide/parity" },
            { text: "Composable atoms", link: "/guide/atoms" },
            { text: "Scroll", link: "/guide/scroll" },
            { text: "Glass & surfaces", link: "/guide/glass" },
            { text: "Effects catalogue", link: "/gallery" },
            { text: "Scroll lab", link: "/scroll-lab" },
            { text: "Surfaces studio", link: "/surfaces" },
            { text: "View transitions", link: "/guide/view-transitions" },
          ],
        },
        {
          text: "Reference",
          items: [
            { text: "Accessibility", link: "/guide/accessibility" },
            { text: "Browser support", link: "/support" },
            { text: "What this cannot do", link: "/limits" },
            { text: "Compare", link: "/compare" },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/radiobros/animatio" },
    ],

    search: { provider: "local" },

    footer: {
      // MIT travels with COPIES OF THE SOFTWARE — LICENSE, NOTICES and the
      // banner in every dist/ file, which check:attribution enforces. A page
      // about the software is not a copy of it, so the footer carries the
      // licence name and points at the file rather than reciting notices.
      message:
        'Free and open source under the MIT licence · built with Animatio — every animation on this site is its own.',
      // The logo carries the name, so the link is the mark alone.
      copyright:
        '<a class="site-foot__brand" href="https://radiobros.com" rel="noopener" ' +
        'aria-label="radioBros">' +
        '<img src="/brand/radiobros.png" alt="radioBros" width="339" height="281">' +
        '</a>',
    },
  },

  // Every block of prose gets the reveal contract at BUILD time (§16.8).
  // Doing it by hand across thirteen pages would rot on the first edit.
  markdown: {
    config: (md) => revealPlugin(md),
  },

  vite: {
    // The gallery reads dist/catalogue.json, which is a BUILD artifact rather
    // than a source file, so adding, removing or regrouping a class changed
    // nothing in a running dev server and the page kept showing the old set.
    // Twice that looked like work not done. The watcher now follows the
    // catalogue and forces a reload when it is rebuilt.
    plugins: [
      {
        name: "animatio-catalogue-reload",
        configureServer(server) {
          const file = fileURLToPath(
            new URL("../../dist/catalogue.json", import.meta.url)
          );
          server.watcher.add(file);
          server.watcher.on("change", (changed) => {
            if (changed !== file) return;
            server.moduleGraph.invalidateAll();
            server.ws.send({ type: "full-reload", path: "*" });
            server.config.logger.info("animatio: catalogue changed — reloading");
          });
        },
      },
    ],

    resolve: {
      alias: {
        "@catalogue": fileURLToPath(
          new URL("../../dist/catalogue.json", import.meta.url)
        ),
        // Dev compiles the SCSS source, so editing a duration in src/ hot-
        // reloads instead of needing a rebuild. The production site ships the
        // real built artifact, which additionally carries the generated
        // reduced-motion block and autoprefixer output -- neither of which
        // changes what an effect looks like while you are working on it.
        "@animatio-css": fileURLToPath(
          new URL(
            IS_BUILD ? "../../dist/animatio.css" : "../../src/_index.scss",
            import.meta.url
          )
        ),
      },
    },
    server: { fs: { allow: [".."] } },
  },
});

// Animatio docs theme. PLAN.md §16
//
// DOGFOODING RULE (§16.8): the site contains zero third-party animation code.
// Every motion here — hero, nav, hovers, scroll choreography, loaders — is
// produced by Animatio classes. If the site needs motion the library cannot
// express, that is a LIBRARY gap and the fix goes in src/, not here.
// `check:dogfood` scans this directory for @keyframes and animation-name.

import DefaultTheme from "vitepress/theme";
import Layout from "./Layout.vue";
// Resolves to the SCSS source in dev and the built CSS in production;
// see the @animatio-css alias in config.mjs.
import "@animatio-css";
import "./styles/site.scss";

import AnPreview from "./components/AnPreview.vue";
import AnGallery from "./components/AnGallery.vue";
import AnHero from "./components/AnHero.vue";
import AnCompare from "./components/AnCompare.vue";
import AnCompose from "./components/AnCompose.vue";
import AnProbe from "./components/AnProbe.vue";
import AnSubject from "./components/AnSubject.vue";
import AnScrollLab from "./components/AnScrollLab.vue";
import AnGlassStudio from "./components/AnGlassStudio.vue";

export default {
  extends: DefaultTheme,
  // Wraps the default layout to paste the SVG filter sprite (§9.5).
  Layout,
  enhanceApp({ app }) {
    app.component("AnPreview", AnPreview);
    app.component("AnGallery", AnGallery);
    app.component("AnHero", AnHero);
    app.component("AnCompare", AnCompare);
    app.component("AnCompose", AnCompose);
    app.component("AnProbe", AnProbe);
    app.component("AnSubject", AnSubject);
    app.component("AnScrollLab", AnScrollLab);
    app.component("AnGlassStudio", AnGlassStudio);
  },
};

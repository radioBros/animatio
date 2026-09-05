<script setup>
// The site layout. PLAN.md §9.5, §16.8
//
// Its one job beyond the default theme is to paste the SVG filter sprite into
// every page. That is the documented one-time install step for the an-svg-*
// family, and skipping it is why an-svg-goo and every other filter effect
// rendered as an empty box: the class was applied, the filter it referenced
// simply did not exist in the document.
//
// The docs site is the library's most demanding consumer, so it performs the
// install step exactly as it tells consumers to.
import DefaultTheme from "vitepress/theme";
import AnFilters from "./components/AnFilters.vue";

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <!-- The brand is a lockup: the icon is the VitePress logo, and the
         wordmark sits beside it here because `logo` only takes one image. -->
    <template #nav-bar-title-after>
      <img
        class="brand__word"
        src="/brand/text-small.png"
        alt="Animatio"
        width="auto"
        height="100%"
      />
    </template>

    <template #layout-bottom>
      <AnFilters />
    </template>
  </Layout>
</template>

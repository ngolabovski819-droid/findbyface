import { c as createComponent } from './astro-component_DgvF6lYD.mjs';
import 'piccolore';
import { n as renderComponent, r as renderTemplate, m as maybeRenderHead, h as addAttribute } from './entrypoint_Diw_7atc.mjs';
import { $ as $$Base, r as renderScript } from './Base_rmWjJ2Qt.mjs';

const $$OnlyfansSearch = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$OnlyfansSearch;
  const q = Astro2.url.searchParams.get("q") ?? "";
  const verified = Astro2.url.searchParams.get("verified") ?? "";
  const price = Astro2.url.searchParams.get("price") ?? "";
  const sort = Astro2.url.searchParams.get("sort") ?? "";
  return renderTemplate`${renderComponent($$result, "Base", $$Base, { "title": "OnlyFans Search Engine | findbyface", "description": "Search millions of OnlyFans creators with advanced filters. Filter by verified status, price, bundles and more.", "data-astro-cid-sqfd377n": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="search-page" data-astro-cid-sqfd377n> <div class="search-header" data-astro-cid-sqfd377n> <h1 data-astro-cid-sqfd377n>OnlyFans Search Engine</h1> <p class="search-sub" data-astro-cid-sqfd377n>Search and filter from millions of creators</p> </div> <div class="search-layout" data-astro-cid-sqfd377n> <aside class="filters" data-astro-cid-sqfd377n> <h3 class="filters-title" data-astro-cid-sqfd377n>Filters</h3> <div class="filter-group" data-astro-cid-sqfd377n> <label class="filter-label" for="searchInput" data-astro-cid-sqfd377n>Search</label> <input type="text" id="searchInput" placeholder="Search creators..."${addAttribute(q, "value")} autocomplete="off" data-astro-cid-sqfd377n> </div> <div class="filter-group" data-astro-cid-sqfd377n> <label class="filter-label toggle-label" data-astro-cid-sqfd377n> <span data-astro-cid-sqfd377n>Verified only</span> <label class="toggle" data-astro-cid-sqfd377n> <input type="checkbox" id="verifiedToggle"${addAttribute(verified === "true", "checked")} data-astro-cid-sqfd377n> <span class="toggle-slider" data-astro-cid-sqfd377n></span> </label> </label> </div> <div class="filter-group" data-astro-cid-sqfd377n> <span class="filter-label" data-astro-cid-sqfd377n>Price</span> <div class="pill-group" id="priceOptions" data-astro-cid-sqfd377n> ${["", "0", "5", "10"].map((p) => renderTemplate`<button${addAttribute(`pill ${price === p ? "active" : ""}`, "class")}${addAttribute(p, "data-price")} data-astro-cid-sqfd377n> ${p === "" ? "Any" : p === "0" ? "Free" : `Under $${p}`} </button>`)} </div> </div> <div class="filter-group" data-astro-cid-sqfd377n> <span class="filter-label" data-astro-cid-sqfd377n>Sort</span> <div class="pill-group" id="sortOptions" data-astro-cid-sqfd377n> <button${addAttribute(`pill ${sort !== "newest" ? "active" : ""}`, "class")} data-sort="" data-astro-cid-sqfd377n>Popular</button> <button${addAttribute(`pill ${sort === "newest" ? "active" : ""}`, "class")} data-sort="newest" data-astro-cid-sqfd377n>Newest</button> </div> </div> <div class="filter-group" data-astro-cid-sqfd377n> <label class="filter-label toggle-label" data-astro-cid-sqfd377n> <span data-astro-cid-sqfd377n>Has bundles</span> <label class="toggle" data-astro-cid-sqfd377n> <input type="checkbox" id="bundlesToggle" data-astro-cid-sqfd377n> <span class="toggle-slider" data-astro-cid-sqfd377n></span> </label> </label> </div> <button class="apply-btn" id="applyBtn" data-astro-cid-sqfd377n>Apply Filters</button> </aside> <div class="results-area" data-astro-cid-sqfd377n> <p class="results-meta" id="resultsCount" data-astro-cid-sqfd377n>Loading...</p> <div class="results-grid" id="resultsGrid" data-astro-cid-sqfd377n></div> <div class="load-more-wrap" id="loadMoreWrap" style="display:none" data-astro-cid-sqfd377n> <button class="load-more-btn" id="loadMoreBtn" data-astro-cid-sqfd377n>Load More</button> </div> </div> </div> </div> ` })} ${renderScript($$result, "C:/Users/nickg/findbyface/src/pages/onlyfans-search.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/nickg/findbyface/src/pages/onlyfans-search.astro", void 0);

const $$file = "C:/Users/nickg/findbyface/src/pages/onlyfans-search.astro";
const $$url = "/onlyfans-search";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$OnlyfansSearch,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

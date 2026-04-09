import { c as createComponent } from './astro-component_DgvF6lYD.mjs';
import 'piccolore';
import { r as renderTemplate, l as defineScriptVars, n as renderComponent, o as Fragment, u as unescapeHTML, m as maybeRenderHead } from './entrypoint_Diw_7atc.mjs';
import { $ as $$Base } from './Base_rmWjJ2Qt.mjs';
import { s as slugToCategory, $ as $$CategoryChips, a as $$CreatorCard } from './CategoryChips_ZbVh4H1p.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a, _b;
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$slug;
  const { slug } = Astro2.params;
  if (!slug) return Astro2.redirect("/");
  const category = slugToCategory(slug);
  if (!category) return Astro2.redirect("/");
  const SUPABASE_URL = "https://sirudrqheimbgpkchtwi.supabase.co"?.replace(/\/+$/, "");
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcnVkcnFoZWltYmdwa2NodHdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTUxNTk0NiwiZXhwIjoyMDc3MDkxOTQ2fQ.FJmA1ChyHy-rgcVMy5aklDrZjijRc-yfyLRC8tN8XFs";
  let creators = [];
  let hasMore = false;
  let total = 0;
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const exprs = category.terms.flatMap((t) => [
        `username.ilike.*${t}*`,
        `name.ilike.*${t}*`,
        `about.ilike.*${t}*`
      ]);
      const params = new URLSearchParams();
      params.set("select", "id,username,name,avatar,isverified,subscribeprice,favoritedcount");
      params.set("or", `(${exprs.join(",")})`);
      params.set("order", "favoritedcount.desc");
      params.set("limit", "50");
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/onlyfans_profiles?${params}`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Accept-Profile": "public",
          Prefer: "count=exact"
        }
      });
      if (resp.ok) {
        const raw = await resp.json();
        const cr = resp.headers.get("Content-Range") ?? "";
        total = parseInt(cr.split("/")[1] ?? "0") || 0;
        hasMore = total > 50;
        creators = raw.map((c) => ({
          id: c.id,
          username: c.username,
          name: c.name,
          avatar: c.avatar,
          isVerified: c.isverified,
          subscribePrice: c.subscribeprice,
          favoritedCount: c.favoritedcount
        }));
      }
    } catch {
    }
  }
  const pageTitle = `Best ${category.label} OnlyFans Creators | findbyface`;
  const pageDesc = `Discover the best ${category.label} OnlyFans creators. ${total ? `Browse ${total.toLocaleString()} profiles` : "Browse thousands of profiles"} and find your favorite.`;
  const canonical = `https://findbyface.org/categories/${slug}/`;
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://findbyface.org/" },
          { "@type": "ListItem", position: 2, name: category.label, item: canonical }
        ]
      },
      {
        "@type": "ItemList",
        name: pageTitle,
        url: canonical,
        numberOfItems: creators.length,
        itemListElement: creators.slice(0, 10).map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: c.name || c.username,
          url: `https://onlyfans.com/${c.username}`
        }))
      }
    ]
  });
  return renderTemplate(_b || (_b = __template(["", " <script>(function(){", `
  let currentPage = 2;
  let isLoading = false;
  let hasMoreResults = initialHasMore;

  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const grid = document.getElementById('creatorsGrid');

  function proxyImg(url, w, h) {
    if (!url || url.startsWith('/')) return url;
    return \`https://images.weserv.nl/?url=\${encodeURIComponent(url.replace(/^https?:\\/\\//, ''))}&w=\${w}&h=\${h}&fit=cover&output=webp\`;
  }

  function renderCard(c) {
    const imgSrc = c.avatar?.startsWith('http') ? proxyImg(c.avatar, 320, 427) : '/no-image.png';
    const price = c.subscribePrice ?? c.subscribeprice;
    const priceLabel = (!price || isNaN(price)) ? 'FREE' : \`$\${parseFloat(price).toFixed(2)}\`;
    const profileUrl = \`https://onlyfans.com/\${encodeURIComponent(c.username)}\`;
    return \`<div class="creator-card">
      <div class="card-img-wrap">
        <img src="\${imgSrc}" alt="\${c.name || c.username}" loading="lazy" decoding="async" referrerpolicy="no-referrer"
          onerror="if(this.src!=='/no-image.png'){this.removeAttribute('srcset');this.src='/no-image.png';}">
      </div>
      <div class="card-body">
        <p class="creator-name">\${c.name || c.username}</p>
        <p class="username">@\${c.username}</p>
        <p class="price \${priceLabel === 'FREE' ? 'price-free' : ''}">\${priceLabel}</p>
        <a href="\${profileUrl}" class="view-btn" target="_blank" rel="noopener">View Profile</a>
      </div>
    </div>\`;
  }

  loadMoreBtn?.addEventListener('click', async () => {
    if (isLoading || !hasMoreResults) return;
    isLoading = true;
    loadMoreBtn.textContent = 'Loading...';
    loadMoreBtn.disabled = true;
    try {
      const resp = await fetch(\`/api/search?q=\${encodeURIComponent(categorySlug)}&page=\${currentPage}&page_size=20\`);
      const data = await resp.json();
      data.creators?.forEach(c => grid?.insertAdjacentHTML('beforeend', renderCard(c)));
      hasMoreResults = data.hasMore;
      currentPage++;
      loadMoreBtn.textContent = 'Load More';
      loadMoreBtn.disabled = false;
      if (!hasMoreResults) loadMoreBtn.style.display = 'none';
    } catch {
      loadMoreBtn.textContent = 'Load More';
      loadMoreBtn.disabled = false;
    }
    isLoading = false;
  });
})();</script>`], ["", " <script>(function(){", `
  let currentPage = 2;
  let isLoading = false;
  let hasMoreResults = initialHasMore;

  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const grid = document.getElementById('creatorsGrid');

  function proxyImg(url, w, h) {
    if (!url || url.startsWith('/')) return url;
    return \\\`https://images.weserv.nl/?url=\\\${encodeURIComponent(url.replace(/^https?:\\\\/\\\\//, ''))}&w=\\\${w}&h=\\\${h}&fit=cover&output=webp\\\`;
  }

  function renderCard(c) {
    const imgSrc = c.avatar?.startsWith('http') ? proxyImg(c.avatar, 320, 427) : '/no-image.png';
    const price = c.subscribePrice ?? c.subscribeprice;
    const priceLabel = (!price || isNaN(price)) ? 'FREE' : \\\`$\\\${parseFloat(price).toFixed(2)}\\\`;
    const profileUrl = \\\`https://onlyfans.com/\\\${encodeURIComponent(c.username)}\\\`;
    return \\\`<div class="creator-card">
      <div class="card-img-wrap">
        <img src="\\\${imgSrc}" alt="\\\${c.name || c.username}" loading="lazy" decoding="async" referrerpolicy="no-referrer"
          onerror="if(this.src!=='/no-image.png'){this.removeAttribute('srcset');this.src='/no-image.png';}">
      </div>
      <div class="card-body">
        <p class="creator-name">\\\${c.name || c.username}</p>
        <p class="username">@\\\${c.username}</p>
        <p class="price \\\${priceLabel === 'FREE' ? 'price-free' : ''}">\\\${priceLabel}</p>
        <a href="\\\${profileUrl}" class="view-btn" target="_blank" rel="noopener">View Profile</a>
      </div>
    </div>\\\`;
  }

  loadMoreBtn?.addEventListener('click', async () => {
    if (isLoading || !hasMoreResults) return;
    isLoading = true;
    loadMoreBtn.textContent = 'Loading...';
    loadMoreBtn.disabled = true;
    try {
      const resp = await fetch(\\\`/api/search?q=\\\${encodeURIComponent(categorySlug)}&page=\\\${currentPage}&page_size=20\\\`);
      const data = await resp.json();
      data.creators?.forEach(c => grid?.insertAdjacentHTML('beforeend', renderCard(c)));
      hasMoreResults = data.hasMore;
      currentPage++;
      loadMoreBtn.textContent = 'Load More';
      loadMoreBtn.disabled = false;
      if (!hasMoreResults) loadMoreBtn.style.display = 'none';
    } catch {
      loadMoreBtn.textContent = 'Load More';
      loadMoreBtn.disabled = false;
    }
    isLoading = false;
  });
})();</script>`])), renderComponent($$result, "Base", $$Base, { "title": pageTitle, "description": pageDesc, "canonical": canonical, "data-astro-cid-dqg6fwsj": true }, { "default": async ($$result2) => renderTemplate`  ${maybeRenderHead()}<div class="category-page" data-astro-cid-dqg6fwsj> <div class="category-header" data-astro-cid-dqg6fwsj> <h1 data-astro-cid-dqg6fwsj> ${category.emoji && renderTemplate`<span class="cat-emoji" data-astro-cid-dqg6fwsj>${category.emoji}</span>`}
Best ${category.label} OnlyFans Creators
</h1> <p class="category-sub" data-astro-cid-dqg6fwsj> ${total ? `${total.toLocaleString()} creators found` : "Browse top creators"} </p> </div> ${renderComponent($$result2, "CategoryChips", $$CategoryChips, { "activeSlug": slug, "data-astro-cid-dqg6fwsj": true })} <div class="category-content" data-astro-cid-dqg6fwsj> ${creators.length > 0 ? renderTemplate`${renderComponent($$result2, "Fragment", Fragment, { "data-astro-cid-dqg6fwsj": true }, { "default": async ($$result3) => renderTemplate` <div class="creators-grid" id="creatorsGrid" data-astro-cid-dqg6fwsj> ${creators.map((c, i) => renderTemplate`${renderComponent($$result3, "CreatorCard", $$CreatorCard, { "creator": c, "index": i, "data-astro-cid-dqg6fwsj": true })}`)} </div> ${hasMore && renderTemplate`<div class="load-more-wrap" data-astro-cid-dqg6fwsj> <button class="load-more-btn" id="loadMoreBtn" data-astro-cid-dqg6fwsj>Load More</button> </div>`}` })}` : renderTemplate`<div class="empty-state" data-astro-cid-dqg6fwsj> <p data-astro-cid-dqg6fwsj>No creators found for this category yet.</p> <a href="/" class="back-link" data-astro-cid-dqg6fwsj>← Back to home</a> </div>`} </div> </div> `, "head": async ($$result2) => renderTemplate`${renderComponent($$result2, "Fragment", Fragment, { "slot": "head" }, { "default": async ($$result3) => renderTemplate(_a || (_a = __template([' <script type="application/ld+json">', "</script> "])), unescapeHTML(jsonLd)) })}` }), defineScriptVars({ categorySlug: slug, initialHasMore: hasMore }));
}, "C:/Users/nickg/findbyface/src/pages/categories/[slug].astro", void 0);
const $$file = "C:/Users/nickg/findbyface/src/pages/categories/[slug].astro";
const $$url = "/categories/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

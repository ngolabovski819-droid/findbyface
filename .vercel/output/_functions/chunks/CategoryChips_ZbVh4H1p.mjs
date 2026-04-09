import { c as createComponent } from './astro-component_DgvF6lYD.mjs';
import 'piccolore';
import { m as maybeRenderHead, h as addAttribute, r as renderTemplate } from './entrypoint_Diw_7atc.mjs';
import 'clsx';

function proxyImg(url, w, h) {
  if (!url || url.startsWith("/")) return url;
  const noScheme = url.replace(/^https?:\/\//, "");
  return `https://images.weserv.nl/?url=${encodeURIComponent(noScheme)}&w=${w}&h=${h}&fit=cover&output=webp`;
}

const $$CreatorCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$CreatorCard;
  const { creator, index } = Astro2.props;
  const name = creator.name || creator.username || "Unknown";
  const username = creator.username || "";
  const avatar = creator.avatar || "";
  const price = creator.subscribePrice ?? creator.subscribeprice;
  const isVerified = creator.isVerified ?? creator.isverified;
  const matchPct = creator.matchPct;
  const imgSrc = avatar?.startsWith("http") ? proxyImg(avatar, 320, 427) : "/no-image.png";
  const imgSrcset = avatar?.startsWith("http") ? [144, 240, 320, 480].map((w) => `${proxyImg(avatar, w, Math.round(w * 4 / 3))} ${w}w`).join(", ") : "";
  const imgSizes = "(max-width:480px) 144px, (max-width:768px) 240px, 320px";
  const priceLabel = !price || isNaN(Number(price)) ? "FREE" : `$${parseFloat(String(price)).toFixed(2)}`;
  const profileUrl = `https://onlyfans.com/${encodeURIComponent(username)}`;
  return renderTemplate`${maybeRenderHead()}<div class="creator-card" data-astro-cid-wx3vkcx3> <div class="card-img-wrap" data-astro-cid-wx3vkcx3> <img${addAttribute(imgSrc, "src")}${addAttribute(imgSrcset || void 0, "srcset")}${addAttribute(imgSrcset ? imgSizes : void 0, "sizes")}${addAttribute(`${name} OnlyFans creator`, "alt")}${addAttribute(index === 0 ? "eager" : "lazy", "loading")}${addAttribute(index === 0 ? "high" : void 0, "fetchpriority")} decoding="async" referrerpolicy="no-referrer" onerror="if(this.src!=='/no-image.png'){this.removeAttribute('srcset');this.src='/no-image.png';}" data-astro-cid-wx3vkcx3> ${matchPct && renderTemplate`<span class="match-badge" data-astro-cid-wx3vkcx3>${matchPct}% match</span>`} </div> <div class="card-body" data-astro-cid-wx3vkcx3> <p class="creator-name" data-astro-cid-wx3vkcx3> ${isVerified && renderTemplate`<span class="verified" title="Verified" data-astro-cid-wx3vkcx3>✓ </span>`}${name} </p> <p class="username" data-astro-cid-wx3vkcx3>@${username}</p> <p${addAttribute(`price ${priceLabel === "FREE" ? "price-free" : ""}`, "class")} data-astro-cid-wx3vkcx3>${priceLabel}</p> <a${addAttribute(profileUrl, "href")} class="view-btn" target="_blank" rel="noopener noreferrer" data-astro-cid-wx3vkcx3>
View Profile
</a> </div> </div>`;
}, "C:/Users/nickg/findbyface/src/components/CreatorCard.astro", void 0);

const categories = [
  { label: "Top", slug: "top", terms: ["top", "best", "popular"], emoji: "🔥" },
  { label: "Blonde", slug: "blonde", terms: ["blonde", "blond"], emoji: "👱" },
  { label: "MILF", slug: "milf", terms: ["milf", "mom", "cougar"] },
  { label: "Trans", slug: "trans", terms: ["trans", "transgender"] },
  { label: "Feet", slug: "feet", terms: ["feet", "foot", "toes"] },
  { label: "BBW", slug: "bbw", terms: ["bbw", "plus size", "curvy"] },
  { label: "Latina", slug: "latina", terms: ["latina", "latinas", "hispanic"] },
  { label: "Asian", slug: "asian", terms: ["asian", "japanese", "korean", "chinese"] },
  { label: "Ebony", slug: "ebony", terms: ["ebony", "black"] },
  { label: "Redhead", slug: "redhead", terms: ["redhead", "ginger", "red hair"] },
  { label: "Petite", slug: "petite", terms: ["petite", "small", "tiny"] },
  { label: "Free", slug: "free", terms: ["free"], emoji: "🆓" },
  { label: "Models", slug: "models", terms: ["model", "models", "modeling"] },
  { label: "White Girls", slug: "white-girls", terms: ["white", "white girl", "caucasian"] },
  { label: "Blowjob", slug: "blowjob", terms: ["blowjob", "bj", "oral"] },
  { label: "Footjob", slug: "footjob", terms: ["footjob", "foot job", "feet"] },
  { label: "Indian", slug: "indian", terms: ["indian", "india", "desi"] },
  { label: "Korean", slug: "korean", terms: ["korean", "korea", "kpop"] },
  { label: "Japanese", slug: "japanese", terms: ["japanese", "japan", "asian japanese"] },
  { label: "Greek", slug: "greek", terms: ["greek", "greece", "hellenic"] },
  { label: "Serbian", slug: "serbian", terms: ["serbian", "serbia", "balkan"] },
  { label: "Bondage", slug: "bondage", terms: ["bondage", "bdsm", "tied"] },
  { label: "BBC", slug: "bbc", terms: ["bbc", "big black cock", "interracial"] },
  { label: "Anal", slug: "anal", terms: ["anal", "booty", "anal sex"] },
  { label: "Small Tits", slug: "small-tits", terms: ["small tits", "small boobs", "flat chest"] },
  { label: "Big Tits", slug: "big-tits", terms: ["big tits", "big boobs", "busty", "large breasts"] },
  { label: "Mature", slug: "mature", terms: ["mature", "older woman", "cougar"] },
  { label: "Hentai", slug: "hentai", terms: ["hentai", "anime", "cosplay anime"] },
  { label: "Old Young", slug: "old-young", terms: ["old young", "age gap", "older"] },
  { label: "Threesome", slug: "threesome", terms: ["threesome", "ffm", "mmf", "group"] },
  { label: "Bukkake", slug: "bukkake", terms: ["bukkake", "facial", "cumshot"] },
  { label: "Celebrity", slug: "celebrity", terms: ["celebrity", "famous", "star"] },
  { label: "Strap On", slug: "strap-on", terms: ["strap on", "strapon", "pegging"] },
  { label: "Italian", slug: "italian", terms: ["italian", "italy", "italiana"] },
  { label: "Dutch", slug: "dutch", terms: ["dutch", "netherlands", "holland"] },
  { label: "Rough Sex", slug: "rough-sex", terms: ["rough sex", "rough", "hardcore"] },
  { label: "Solo Male", slug: "solo-male", terms: ["solo male", "male", "guy", "man"] },
  { label: "Pussy Licking", slug: "pussy-licking", terms: ["pussy licking", "cunnilingus", "eating out"] }
  // Add more as needed — never create a new .astro file per category
];
function slugToCategory(slug) {
  return categories.find((c) => c.slug === slug);
}

const $$CategoryChips = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$CategoryChips;
  const { activeSlug } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<div class="chips-wrapper" data-astro-cid-an6u5cb5> <div class="chips" data-astro-cid-an6u5cb5> ${categories.map((cat) => renderTemplate`<a${addAttribute(`/categories/${cat.slug}/`, "href")}${addAttribute(`chip ${activeSlug === cat.slug ? "chip-active" : ""}`, "class")} data-astro-cid-an6u5cb5> ${cat.emoji && renderTemplate`<span aria-hidden="true" data-astro-cid-an6u5cb5>${cat.emoji}</span>`} ${cat.label} </a>`)} </div> </div>`;
}, "C:/Users/nickg/findbyface/src/components/CategoryChips.astro", void 0);

export { $$CategoryChips as $, $$CreatorCard as a, slugToCategory as s };

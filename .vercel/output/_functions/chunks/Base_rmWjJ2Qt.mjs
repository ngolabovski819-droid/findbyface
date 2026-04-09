import { c as createComponent } from './astro-component_DgvF6lYD.mjs';
import 'piccolore';
import { p as createRenderInstruction, m as maybeRenderHead, h as addAttribute, r as renderTemplate, q as renderSlot, n as renderComponent, v as renderHead } from './entrypoint_Diw_7atc.mjs';
import 'clsx';

async function renderScript(result, id) {
  const inlined = result.inlinedScripts.get(id);
  let content = "";
  if (inlined != null) {
    if (inlined) {
      content = `<script type="module">${inlined}</script>`;
    }
  } else {
    const resolved = await result.resolve(id);
    content = `<script type="module" src="${result.userAssetsBase ? (result.base === "/" ? "" : result.base) + result.userAssetsBase : ""}${resolved}"></script>`;
  }
  return createRenderInstruction({ type: "script", id, content });
}

const $$Nav = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Nav;
  const pathname = Astro2.url.pathname;
  const isHome = pathname === "/" || pathname === "";
  const isSearch = pathname.startsWith("/onlyfans-search");
  return renderTemplate`${maybeRenderHead()}<header class="nav" data-astro-cid-dmqpwcec> <div class="nav-inner" data-astro-cid-dmqpwcec> <a href="/" class="nav-logo" data-astro-cid-dmqpwcec> <span class="logo-find" data-astro-cid-dmqpwcec>find</span><span class="logo-byface" data-astro-cid-dmqpwcec>byface</span> </a> <nav class="nav-links" id="navLinks" data-astro-cid-dmqpwcec> <a href="/"${addAttribute(isHome ? "active" : "", "class")} data-astro-cid-dmqpwcec>Home</a> <a href="/onlyfans-search/"${addAttribute(isSearch ? "active" : "", "class")} data-astro-cid-dmqpwcec>OnlyFans Search</a> </nav> <div class="nav-right" data-astro-cid-dmqpwcec> <!-- Signed-out state (default, overridden by JS if signed in) --> <a href="https://sirudrqheimbgpkchtwi.supabase.co/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Ffindbyface.org%2Fauth%2Fcallback" class="sign-in-btn" id="signInBtn" data-astro-cid-dmqpwcec>Sign in</a> <!-- Signed-in state (hidden until JS sets it) --> <div class="user-pill" id="userPill" style="display:none" data-astro-cid-dmqpwcec> <div class="user-avatar" id="userAvatar" data-astro-cid-dmqpwcec></div> <span class="user-name" id="userName" data-astro-cid-dmqpwcec></span> <button class="sign-out-btn" id="signOutBtn" data-astro-cid-dmqpwcec>Sign out</button> </div> <button class="hamburger" id="hamburger" aria-label="Open menu" data-astro-cid-dmqpwcec> <span data-astro-cid-dmqpwcec></span> <span data-astro-cid-dmqpwcec></span> <span data-astro-cid-dmqpwcec></span> </button> </div> </div> </header> ${renderScript($$result, "C:/Users/nickg/findbyface/src/components/Nav.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/nickg/findbyface/src/components/Nav.astro", void 0);

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Base = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Base;
  const {
    title,
    description = "Find lookalike OnlyFans creators instantly. Upload a photo and discover matching creators in seconds.",
    canonical
  } = Astro2.props;
  const canonicalUrl = canonical ?? new URL(Astro2.url.pathname, "https://findbyface.org").href;
  return renderTemplate(_a || (_a = __template(['<html lang="en"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><!-- Google tag (gtag.js) --><script async src="https://www.googletagmanager.com/gtag/js?id=G-G3L4HTH15M"><\/script>', "<title>", '</title><meta name="description"', '><link rel="canonical"', '><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">', "", "</head> <body> ", " <main> ", ' </main> <footer class="site-footer"> <div class="footer-inner"> <a href="/" class="logo-text"><span style="color:#fff">find</span><span style="background:linear-gradient(135deg,#7c3aed,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">byface</span></a> <nav class="footer-links"> <a href="/blog/">Blog</a> <a href="/onlyfans-search/">Search</a> <a href="/categories/top/">Categories</a> </nav> <p class="footer-legal">© ', " findbyface.org — For entertainment purposes only. Results are based on visual similarity and are not an indication of identity.</p> </div> </footer></body></html>"])), renderScript($$result, "C:/Users/nickg/findbyface/src/layouts/Base.astro?astro&type=script&index=0&lang.ts"), title, addAttribute(description, "content"), addAttribute(canonicalUrl, "href"), renderSlot($$result, $$slots["head"]), renderHead(), renderComponent($$result, "Nav", $$Nav, {}), renderSlot($$result, $$slots["default"]), (/* @__PURE__ */ new Date()).getFullYear());
}, "C:/Users/nickg/findbyface/src/layouts/Base.astro", void 0);

export { $$Base as $, renderScript as r };

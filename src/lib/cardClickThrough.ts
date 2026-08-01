// Makes a whole `.creator-card[data-href]` clickable to the same destination as its
// "View Profile" link, without swallowing clicks on nested interactive elements (the
// view-btn itself, and any future wishlist/favorite icon buttons) — those are left to
// handle themselves natively via event delegation's closest('a, button') bail-out.
// Safe to call from multiple components on the same page (e.g. a page's own script and
// a component it renders, like UploadBox.astro on index.astro) — guarded so the listener
// is only ever registered once per page. Delegates from `document` so it also covers cards
// inserted later (load more, face-search results) without re-binding.
let initialized = false;
export function initCardClickThrough(): void {
  if (initialized) return;
  initialized = true;
  document.addEventListener('click', e => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target.closest('a, button')) return; // let real interactive elements behave natively

    const card = target.closest<HTMLElement>('.creator-card[data-href]');
    if (!card) return;

    // Locked face-search cards send visitors to the full signup page. The visible
    // Unlock link handles its own native navigation; this covers clicks elsewhere.
    if (card.classList.contains('locked')) {
      e.preventDefault();
      window.location.assign('/signup');
      return;
    }

    const href = card.dataset.href;
    if (href) {
      e.preventDefault();
      window.location.assign(href);
    }
  }, true);
}

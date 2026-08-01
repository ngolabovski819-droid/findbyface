// Shared "recent searches" dropdown wiring, used by every search bar on the site.
// Renders ranked sponsored rows (fetched once from /api/search-ad) above the recent
// search history, opens on focus of an EMPTY input, and lets the caller decide what
// happens when a history row is picked (re-run search in place vs navigate away).
import { getHistory, pushHistory, removeHistory, clearHistory } from './searchHistory';

export interface SearchDropdownRefs {
  wrapper: HTMLElement; // outside-click boundary
  input: HTMLInputElement;
  dropdown: HTMLElement;
  adSlot: HTMLElement;
  historyList: HTMLElement;
  clearAllBtn: HTMLElement;
  onSelect: (q: string) => void;
}

interface SearchAd {
  username: string;
  name: string;
  avatar: string;
  profileUrl: string;
}

function escHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function proxyImg(url: string, w: number, h: number): string {
  if (url?.startsWith('/')) return url;
  if (!url || !url.startsWith('http')) return '';
  return `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}&w=${w}&h=${h}&fit=cover&output=webp`;
}

// Fetched once per page load and shared by every dropdown instance on that page.
let adsPromise: Promise<SearchAd[]> | null = null;
function loadAds(): Promise<SearchAd[]> {
  if (!adsPromise) {
    adsPromise = fetch('/api/search-ad?v=2')
      .then(r => r.json())
      .then(d => d.ads ?? (d.ad ? [d.ad] : []))
      .catch(() => []);
  }
  return adsPromise;
}

export function initSearchDropdown(refs: SearchDropdownRefs): void {
  const { wrapper, input, dropdown, adSlot, historyList, clearAllBtn, onSelect } = refs;

  function renderAds(ads: SearchAd[]): void {
    if (!ads.length) {
      adSlot.innerHTML = '';
      adSlot.style.display = 'none';
      return;
    }
    adSlot.style.display = 'grid';
    adSlot.style.gap = '6px';
    adSlot.innerHTML = ads.map(ad => {
      const img = proxyImg(ad.avatar, 72, 72);
      return `
      <a class="dd-ad-row" href="${ad.profileUrl}" target="_blank" rel="noopener nofollow sponsored">
        <span class="dd-ad-avatar">${img ? `<img src="${img}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}</span>
        <span class="dd-ad-body">
          <span class="dd-ad-name">${escHtml(ad.name || ad.username)}</span>
          <span class="sponsored-badge" aria-label="Advertisement" title="Paid placement">Ad</span>
        </span>
      </a>`;
    }).join('');
  }

  function renderHistory(): void {
    const history = getHistory();
    historyList.innerHTML = history.map(q => `
      <div class="dd-row" data-q="${escHtml(q)}">
        <svg class="dd-row-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span class="dd-row-text">${escHtml(q)}</span>
        <button class="dd-row-del" type="button" data-q="${escHtml(q)}" aria-label="Remove">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `).join('');
    clearAllBtn.style.display = history.length ? 'inline-block' : 'none';
  }

  function openDropdown(): void {
    if (input.value.trim() !== '') return; // only on an empty input
    renderHistory();
    loadAds().then(renderAds);
    dropdown.style.display = 'block';
  }

  function closeDropdown(): void {
    dropdown.style.display = 'none';
  }

  dropdown.addEventListener('click', e => {
    const target = e.target as HTMLElement;

    const delBtn = target.closest<HTMLElement>('.dd-row-del');
    if (delBtn) {
      e.stopPropagation();
      removeHistory(delBtn.dataset.q!);
      renderHistory();
      return;
    }

    const row = target.closest<HTMLElement>('.dd-row');
    if (row) {
      const q = row.dataset.q!;
      closeDropdown();
      pushHistory(q);
      onSelect(q);
    }
    // Clicks on `.dd-ad-row` are a real <a href> — let them navigate natively.
  });

  clearAllBtn.addEventListener('click', () => {
    clearHistory();
    renderHistory();
  });

  input.addEventListener('focus', openDropdown);
  input.addEventListener('input', () => {
    if (input.value.trim() !== '') closeDropdown();
  });

  document.addEventListener('click', e => {
    if (!wrapper.contains(e.target as Node)) closeDropdown();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDropdown();
  });
}

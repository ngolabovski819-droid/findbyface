// Shared search autocomplete used by the creator directory search.
// Empty input: one sponsored creator, recent searches, and curated categories.
// Typed input: instant category matches plus lightweight creator suggestions.
import { categories, type Category } from '../config/categories';
import {
  clearAccountDirectoryHistoryForOwner,
  currentAccountId,
  deleteAccountDirectoryHistoryByQueryForOwner,
  importBrowserHistoryToAccountForOwner,
  loadAccountSearchHistoryForOwner,
} from './accountSearchHistory';
import {
  clearHistoryForOwner,
  getHistoryForOwner,
  pushHistoryForOwner,
  removeHistoryForOwner,
} from './searchHistory';
import { IMAGE_PLACEHOLDER, proxyImg as sharedProxyImg } from '../utils/image';

export interface SearchDropdownRefs {
  wrapper: HTMLElement;
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

interface CreatorSuggestion {
  id: string | number;
  username: string;
  name: string | null;
  avatar: string | null;
  isVerified: boolean;
  favoritedCount: number;
  profileUrl: string;
}

const POPULAR_CATEGORY_SLUGS = ['milf', 'latina', 'blonde', 'asian', 'bbw', 'feet'];
const SUGGESTION_DELAY_MS = 180;
const MAX_CATEGORY_RESULTS = 5;

// Client-side lib: locale comes from the <html lang> Base.astro rendered.
const IS_ES = typeof document !== 'undefined' && document.documentElement.lang === 'es';
const L = IS_ES
  ? {
      popularCategories: 'Categorías populares',
      categories: 'Categorías',
      creators: 'Creadoras',
      search: 'Buscar',
      suggestions: 'Sugerencias de búsqueda',
      sponsored: 'Patrocinado',
      sponsoredCreator: 'Creadora patrocinada',
      removeRecent: (q: string) => `Quitar ${q} de búsquedas recientes`,
      browseCategory: 'Explorar categoría',
      verified: 'Verificada',
      creatorsUnavailable: 'Las sugerencias de creadoras no están disponibles. Aún puedes buscar.',
      noMatching: 'No hay nombres de creadoras coincidentes',
      finding: 'Buscando creadoras…',
      searchAllFor: (q: string) => `Buscar “${q}” entre todas las creadoras`,
      typeOneMore: 'Escribe un carácter más para buscar nombres de creadoras.',
    }
  : {
      popularCategories: 'Popular categories',
      categories: 'Categories',
      creators: 'Creators',
      search: 'Search',
      suggestions: 'Search suggestions',
      sponsored: 'Sponsored',
      sponsoredCreator: 'Sponsored creator',
      removeRecent: (q: string) => `Remove ${q} from recent searches`,
      browseCategory: 'Browse category',
      verified: 'Verified',
      creatorsUnavailable: 'Creator suggestions are unavailable. You can still search.',
      noMatching: 'No matching creator names',
      finding: 'Finding creators…',
      searchAllFor: (q: string) => `Search all creators for “${q}”`,
      typeOneMore: 'Type one more character to search creator names.',
    };

const categoryLabel = (category: Category): string => (IS_ES ? category.labelEs : category.label);
const categoryHref = (category: Category): string => IS_ES
  ? `/es/categorias/${encodeURIComponent(category.slugEs ?? category.slug)}/`
  : `/categories/${encodeURIComponent(category.slug)}/`;

// Dropdown rows skip the <img> entirely when there is nothing to show, so unlike the
// shared helper this returns '' (not the placeholder) for a missing or garbage avatar.
function proxyImg(url: string | null | undefined, w: number, h: number): string {
  if (!url) return '';
  const src = sharedProxyImg(url, w, h);
  return src === IMAGE_PLACEHOLDER ? '' : src;
}

function safeHref(value: string | null | undefined, fallback: string): string {
  if (value?.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value ?? '');
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.toString();
  } catch { /* use the known-safe fallback */ }
  return fallback;
}

function normalize(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase();
}

function categoryMatches(query: string): Category[] {
  const needle = normalize(query);
  if (!needle) return [];

  return categories
    .map((category, originalIndex) => {
      const candidates = [category.label, category.labelEs, ...category.terms].map(normalize);
      const exact = candidates.some(value => value === needle);
      const prefix = candidates.some(value => value.startsWith(needle));
      const contains = needle.length >= 2 && candidates.some(value => value.includes(needle));
      return { category, originalIndex, rank: exact ? 0 : prefix ? 1 : contains ? 2 : 3 };
    })
    .filter(match => match.rank < 3)
    .sort((a, b) => a.rank - b.rank || a.originalIndex - b.originalIndex)
    .slice(0, MAX_CATEGORY_RESULTS)
    .map(match => match.category);
}

// Fetched once per page load and shared by every dropdown instance on that page.
let adsPromise: Promise<SearchAd[]> | null = null;
function loadAds(): Promise<SearchAd[]> {
  if (!adsPromise) {
    adsPromise = fetch('/api/search-ad?v=2')
      .then(response => response.ok ? response.json() : { ads: [] })
      .then(data => data.ads ?? (data.ad ? [data.ad] : []))
      .catch(() => []);
  }
  return adsPromise;
}

function makeSection(label: string): { section: HTMLElement; list: HTMLElement } {
  const section = document.createElement('section');
  section.className = 'dd-section';
  section.hidden = true;

  const heading = document.createElement('div');
  heading.className = 'dd-section-label';
  heading.textContent = label;

  const list = document.createElement('div');
  list.className = 'dd-options';

  section.append(heading, list);
  return { section, list };
}

function setText(parent: HTMLElement, className: string, text: string): HTMLElement {
  const element = document.createElement('span');
  element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

export function initSearchDropdown(refs: SearchDropdownRefs): void {
  const { wrapper, input, dropdown, adSlot, historyList, clearAllBtn, onSelect } = refs;
  const historyHeader = historyList.previousElementSibling as HTMLElement | null;
  const popular = makeSection(L.popularCategories);
  const matchingCategories = makeSection(L.categories);
  const profiles = makeSection(L.creators);
  const searchAll = makeSection(L.search);
  dropdown.append(popular.section, matchingCategories.section, profiles.section, searchAll.section);

  let isOpen = false;
  let activeIndex = -1;
  let optionSerial = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let suggestionsController: AbortController | null = null;
  let requestSequence = 0;
  let historyGeneration = 0;
  const ownerAccountId = currentAccountId();

  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-haspopup', 'listbox');
  input.setAttribute('aria-controls', dropdown.id);
  input.setAttribute('aria-expanded', 'false');
  dropdown.setAttribute('role', 'listbox');
  dropdown.setAttribute('aria-label', L.suggestions);

  function options(): HTMLElement[] {
    return Array.from(dropdown.querySelectorAll<HTMLElement>('[role="option"]'))
      .filter(option => !option.closest<HTMLElement>('[hidden]'));
  }

  function refreshOptionIds(): void {
    options().forEach(option => {
      if (!option.id) option.id = `${dropdown.id}-option-${++optionSerial}`;
      option.setAttribute('aria-selected', 'false');
    });
    setActive(-1);
  }

  function setActive(index: number): void {
    const currentOptions = options();
    currentOptions.forEach(option => {
      option.classList.remove('is-active');
      option.setAttribute('aria-selected', 'false');
    });

    if (!currentOptions.length || index < 0) {
      activeIndex = -1;
      input.removeAttribute('aria-activedescendant');
      return;
    }

    activeIndex = ((index % currentOptions.length) + currentOptions.length) % currentOptions.length;
    const active = currentOptions[activeIndex];
    active.classList.add('is-active');
    active.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', active.id);
    active.scrollIntoView({ block: 'nearest' });
  }

  function setOpen(open: boolean): void {
    isOpen = open;
    dropdown.style.display = open ? 'block' : 'none';
    input.setAttribute('aria-expanded', String(open));
    if (!open) setActive(-1);
  }

  function closeDropdown(): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    suggestionsController?.abort();
    suggestionsController = null;
    setOpen(false);
  }

  function makeOption(action: string): HTMLElement {
    const option = document.createElement('div');
    option.className = 'dd-option';
    option.setAttribute('role', 'option');
    option.setAttribute('tabindex', '-1');
    option.dataset.action = action;
    return option;
  }

  function renderAd(ads: SearchAd[]): void {
    adSlot.replaceChildren();
    adSlot.style.display = 'none';
    if (!isOpen || input.value.trim() || !ads.length) return;

    const ad = ads[0];
    const fallback = `https://onlyfans.com/${encodeURIComponent(ad.username)}`;
    const link = document.createElement('a');
    link.className = 'dd-ad-row dd-option';
    link.href = safeHref(ad.profileUrl, fallback);
    link.target = '_blank';
    link.rel = 'noopener nofollow sponsored';
    link.setAttribute('role', 'option');
    link.setAttribute('tabindex', '-1');
    link.dataset.action = 'link';

    const avatar = document.createElement('span');
    avatar.className = 'dd-ad-avatar';
    const imageUrl = proxyImg(ad.avatar, 72, 72);
    if (imageUrl) {
      const image = document.createElement('img');
      image.src = imageUrl;
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.referrerPolicy = 'no-referrer';
      avatar.append(image);
    }

    const body = document.createElement('span');
    body.className = 'dd-ad-body';
    setText(body, 'dd-ad-name', ad.name || ad.username);
    const badge = setText(body, 'sponsored-badge', L.sponsored);
    badge.setAttribute('aria-label', L.sponsoredCreator);
    link.append(avatar, body);
    adSlot.append(link);
    adSlot.style.display = 'block';
    refreshOptionIds();
  }

  function renderHistory(): void {
    const history = getHistoryForOwner(ownerAccountId).slice(0, 3);
    historyList.replaceChildren();
    historyList.hidden = history.length === 0;
    if (historyHeader) historyHeader.hidden = history.length === 0;
    clearAllBtn.style.display = history.length ? 'inline-block' : 'none';

    history.forEach(query => {
      const row = makeOption('search');
      row.classList.add('dd-row');
      row.dataset.query = query;

      const icon = setText(row, 'dd-row-symbol', '↶');
      icon.setAttribute('aria-hidden', 'true');
      setText(row, 'dd-row-text', query);

      const remove = document.createElement('button');
      remove.className = 'dd-row-del';
      remove.type = 'button';
      remove.dataset.removeQuery = query;
      remove.setAttribute('aria-label', L.removeRecent(query));
      remove.textContent = '×';
      row.append(remove);
      historyList.append(row);
    });
  }

  void (async () => {
    const generation = historyGeneration;
    await importBrowserHistoryToAccountForOwner(ownerAccountId);
    const page = await loadAccountSearchHistoryForOwner(ownerAccountId, { limit: 100, type: 'directory' });
    if (!page || generation !== historyGeneration || currentAccountId() !== ownerAccountId) return;
    const queries = page.items.reduce<string[]>((unique, item) => {
      const query = item.query?.trim();
      if (query && !unique.some(value => value.toLocaleLowerCase() === query.toLocaleLowerCase())) {
        unique.push(query);
      }
      return unique;
    }, []);
    clearHistoryForOwner(ownerAccountId);
    [...queries.slice(0, 8)].reverse().forEach(query => pushHistoryForOwner(query, ownerAccountId));
    if (!input.value.trim()) {
      renderHistory();
      refreshOptionIds();
    }
  })();

  function categoryOption(category: Category): HTMLElement {
    const option = makeOption('category');
    option.dataset.href = categoryHref(category);
    const icon = setText(option, 'dd-category-icon', '#');
    icon.setAttribute('aria-hidden', 'true');
    const body = document.createElement('span');
    body.className = 'dd-option-body';
    setText(body, 'dd-option-title', categoryLabel(category));
    setText(body, 'dd-option-meta', L.browseCategory);
    option.append(body);
    return option;
  }

  function renderCategorySection(target: { section: HTMLElement; list: HTMLElement }, matches: Category[]): void {
    target.list.replaceChildren(...matches.map(categoryOption));
    target.section.hidden = matches.length === 0;
  }

  function renderPopular(): void {
    const curated = POPULAR_CATEGORY_SLUGS
      .map(slug => categories.find(category => category.slug === slug))
      .filter((category): category is Category => Boolean(category));
    renderCategorySection(popular, curated);
  }

  function creatorOption(creator: CreatorSuggestion): HTMLElement {
    const option = makeOption('creator');
    const fallback = `https://onlyfans.com/${encodeURIComponent(creator.username)}`;
    option.dataset.href = safeHref(creator.profileUrl, fallback);

    const avatar = document.createElement('span');
    avatar.className = 'dd-creator-avatar';
    const imageUrl = proxyImg(creator.avatar, 80, 80);
    if (imageUrl) {
      const image = document.createElement('img');
      image.src = imageUrl;
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.referrerPolicy = 'no-referrer';
      avatar.append(image);
    }

    const body = document.createElement('span');
    body.className = 'dd-option-body';
    const title = document.createElement('span');
    title.className = 'dd-option-title';
    title.textContent = creator.name || creator.username;
    if (creator.isVerified) {
      const verified = setText(title, 'dd-verified', '✓');
      verified.setAttribute('aria-label', L.verified);
    }
    body.append(title);
    setText(body, 'dd-option-meta', `@${creator.username}`);
    option.append(avatar, body);
    return option;
  }

  function renderProfiles(creators: CreatorSuggestion[], failed = false): void {
    profiles.list.replaceChildren();
    profiles.section.hidden = false;
    if (!creators.length) {
      const empty = document.createElement('p');
      empty.className = 'dd-empty';
      empty.textContent = failed ? L.creatorsUnavailable : L.noMatching;
      profiles.list.append(empty);
    } else {
      profiles.list.append(...creators.slice(0, 6).map(creatorOption));
    }
    refreshOptionIds();
  }

  function renderLoading(): void {
    profiles.section.hidden = false;
    const loading = document.createElement('p');
    loading.className = 'dd-empty dd-loading';
    loading.setAttribute('role', 'status');
    loading.textContent = L.finding;
    profiles.list.replaceChildren(loading);
  }

  function renderSearchAll(query: string): void {
    searchAll.list.replaceChildren();
    searchAll.section.hidden = query.length < 2;
    if (query.length < 2) return;
    const option = makeOption('search');
    option.classList.add('dd-search-all');
    option.dataset.query = query;
    setText(option, 'dd-search-icon', '⌕').setAttribute('aria-hidden', 'true');
    const body = document.createElement('span');
    body.className = 'dd-option-body';
    setText(body, 'dd-option-title', L.searchAllFor(query));
    option.append(body);
    searchAll.list.append(option);
  }

  async function fetchCreatorSuggestions(query: string, sequence: number): Promise<void> {
    suggestionsController?.abort();
    const controller = new AbortController();
    suggestionsController = controller;
    renderLoading();

    try {
      const response = await fetch(`/api/search-suggestions?q=${encodeURIComponent(query)}&limit=6`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Suggestion request failed');
      const data = await response.json() as { creators?: CreatorSuggestion[] };
      if (controller.signal.aborted || sequence !== requestSequence || normalize(input.value) !== normalize(query)) return;
      renderProfiles(Array.isArray(data.creators) ? data.creators : []);
    } catch (error) {
      if (controller.signal.aborted || sequence !== requestSequence) return;
      renderProfiles([], true);
    }
  }

  function showEmptyState(): void {
    requestSequence++;
    suggestionsController?.abort();
    adSlot.style.display = 'none';
    renderHistory();
    renderPopular();
    matchingCategories.section.hidden = true;
    profiles.section.hidden = true;
    searchAll.section.hidden = true;
    setOpen(true);
    refreshOptionIds();
    loadAds().then(renderAd);
  }

  function showTypedState(rawQuery: string): void {
    const query = rawQuery.trim();
    requestSequence++;
    const sequence = requestSequence;
    suggestionsController?.abort();
    adSlot.replaceChildren();
    adSlot.style.display = 'none';
    historyList.hidden = true;
    if (historyHeader) historyHeader.hidden = true;
    popular.section.hidden = true;
    profiles.section.hidden = true;
    renderCategorySection(matchingCategories, categoryMatches(query));
    renderSearchAll(query);
    setOpen(true);
    refreshOptionIds();

    if (query.length < 2) {
      if (matchingCategories.section.hidden) {
        searchAll.section.hidden = false;
        const hint = document.createElement('p');
        hint.className = 'dd-empty';
        hint.textContent = L.typeOneMore;
        searchAll.list.replaceChildren(hint);
      }
      return;
    }
    renderLoading();
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fetchCreatorSuggestions(query, sequence), SUGGESTION_DELAY_MS);
  }

  function updateForInput(): void {
    const query = input.value.trim();
    if (debounceTimer) clearTimeout(debounceTimer);
    if (query) showTypedState(query);
    else showEmptyState();
  }

  function commitSearch(query: string): void {
    const trimmed = query.trim();
    if (!trimmed) return;
    input.value = trimmed;
    try { pushHistoryForOwner(trimmed, ownerAccountId); } catch { /* browser storage must not block a search */ }
    historyGeneration++;
    closeDropdown();
    onSelect(trimmed);
  }

  function activateOption(option: HTMLElement): void {
    const action = option.dataset.action;
    if (action === 'search') {
      commitSearch(option.dataset.query ?? input.value);
      return;
    }
    if (action === 'category' || action === 'creator') {
      const href = option.dataset.href;
      if (href) window.location.assign(href);
      return;
    }
    if (action === 'link' && option instanceof HTMLAnchorElement) {
      window.open(option.href, '_blank', 'noopener');
    }
  }

  dropdown.addEventListener('pointerdown', event => {
    // Keep focus on the combobox so aria-activedescendant and keyboard flow stay intact.
    if (!(event.target as HTMLElement).closest('button')) event.preventDefault();
  });

  dropdown.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    const remove = target.closest<HTMLElement>('[data-remove-query]');
    if (remove) {
      event.stopPropagation();
      const query = remove.dataset.removeQuery ?? '';
      removeHistoryForOwner(query, ownerAccountId);
      historyGeneration++;
      renderHistory();
      refreshOptionIds();
      if (!ownerAccountId) return;
      void (async () => {
        const deleted = await deleteAccountDirectoryHistoryByQueryForOwner(ownerAccountId, query);
        if (!deleted && currentAccountId() === ownerAccountId) {
          pushHistoryForOwner(query, ownerAccountId);
          renderHistory();
          refreshOptionIds();
        }
      })();
      return;
    }

    const option = target.closest<HTMLElement>('[role="option"]');
    // Sponsored rows are real anchors: preserve native click/open-in-new-tab behavior.
    // Calling activateOption here would recursively dispatch another click.
    if (option?.dataset.action === 'link') return;
    if (option) activateOption(option);
  });

  clearAllBtn.addEventListener('click', event => {
    event.stopPropagation();
    const previous = getHistoryForOwner(ownerAccountId);
    clearHistoryForOwner(ownerAccountId);
    historyGeneration++;
    renderHistory();
    refreshOptionIds();
    input.focus();
    if (!ownerAccountId) return;
    void (async () => {
      const cleared = await clearAccountDirectoryHistoryForOwner(ownerAccountId);
      if (!cleared && currentAccountId() === ownerAccountId) {
        [...previous].reverse().forEach(query => pushHistoryForOwner(query, ownerAccountId));
        renderHistory();
        refreshOptionIds();
      }
    })();
  });

  input.addEventListener('focus', updateForInput);
  input.addEventListener('input', updateForInput);
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!isOpen) updateForInput();
      setActive(activeIndex + (event.key === 'ArrowDown' ? 1 : -1));
      return;
    }

    if (event.key === 'Enter') {
      const currentOptions = options();
      const active = activeIndex >= 0 ? currentOptions[activeIndex] : undefined;
      const query = input.value.trim();
      if (active || query) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (active) activateOption(active);
        else commitSearch(query);
      }
      return;
    }

    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeDropdown();
    }
  });

  document.addEventListener('click', event => {
    if (!wrapper.contains(event.target as Node)) closeDropdown();
  });

  window.addEventListener('storage', event => {
    if (event.key === 'fbf_user' && currentAccountId() !== ownerAccountId) {
      historyGeneration++;
      closeDropdown();
      window.location.reload();
    }
  });
}

// Registry of panel.findbyface.org tenants. Keys are the same OnlyFans username slug used in
// src/config/sponsors.ts — the panel cross-references that file for the actual clickTable name
// (see src/lib/panelStats.ts) rather than duplicating it here. This file only owns
// panel-facing display concerns (what the client sees themselves called).
export interface PanelClient {
  displayName: string;
}

export const panelClients: Record<string, PanelClient> = {
  emilylopz: { displayName: 'Emily' },
  rocketreynaxo: { displayName: 'Rocket' },
  hannazuki: { displayName: 'Hanna' },
};

// Used when an admin session's token has no client_slug (e.g. a future all-access admin
// landing) — never used for guest sessions, which are always scoped to their own token.
export const DEFAULT_CLIENT_SLUG = 'emilylopz';

export function getPanelClient(slug: string | null | undefined): PanelClient | undefined {
  if (!slug) return undefined;
  return panelClients[slug];
}

export interface ModelOption {
  slug: string;
  displayName: string;
}

// Turns a session's raw clientSlugs into displayable {slug, displayName} pairs, silently
// dropping anything that isn't (or is no longer) a configured model — a stale slug in an old
// login's token metadata shouldn't render as a broken tab.
export function modelOptionsFor(slugs: string[]): ModelOption[] {
  return slugs
    .filter((slug) => panelClients[slug])
    .map((slug) => ({ slug, displayName: panelClients[slug].displayName }));
}

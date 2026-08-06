// Registers OTHER network sites' click-log tables for a panel client, so the dashboard can
// report cross-network campaign performance, not just findbyface's own. findbyface's own
// table is NOT duplicated here — src/lib/panelStats.ts still reads that from
// src/config/sponsors.ts (the existing single source of truth for this site's table) and
// only adds these as the additional legs.
//
// All four sites share ONE Supabase project (sirudrqheimbgpkchtwi.supabase.co, confirmed
// directly against each sibling repo's own .env) — these are just more tables reachable with
// the same SUPABASE_URL/SUPABASE_KEY already in this project's .env, no new credentials.
//
// Every sibling site invented its own click-table naming convention AND timestamp column name
// independently (findbyface: sponsor_clicks_<user>_fbf / created_at; fanspedia: plain
// sponsor_clicks_<user>, no suffix at all / clicked_at; onlyamericanfans:
// sponsor_clicks_<user>_oaf / clicked_at; onlyaussiefans: sponsor_clicks_oaussief_<user>,
// site tag BEFORE the username / clicked_at) — so none of this can be derived from a shared
// template. Entries here are copied by hand from each site's own sponsors config +
// migrations, and need to be updated by hand if a campaign is added/removed/renamed on that
// site. Verified live against each site's repo on 2026-08-05 (emilylopz) and 2026-08-06
// (rocketreynaxo, hannazuki).
export interface NetworkClickSource {
  site: string;
  table: string;
  timestampColumn: 'created_at' | 'clicked_at';
}

export const networkClickSources: Record<string, NetworkClickSource[]> = {
  emilylopz: [
    { site: 'fanspedia.net', table: 'sponsor_clicks_emilylopz', timestampColumn: 'clicked_at' },
    { site: 'onlyamericanfans.com', table: 'sponsor_clicks_emilylopz_oaf', timestampColumn: 'clicked_at' },
    { site: 'onlyaussiefans.com', table: 'sponsor_clicks_oaussief_emilylopz', timestampColumn: 'clicked_at' },
  ],
  rocketreynaxo: [
    { site: 'fanspedia.net', table: 'sponsor_clicks_rocketreynaxo', timestampColumn: 'clicked_at' },
    { site: 'onlyamericanfans.com', table: 'sponsor_clicks_rocketreynaxo_oaf', timestampColumn: 'clicked_at' },
    { site: 'onlyaussiefans.com', table: 'sponsor_clicks_oaussief_rocketreynaxo', timestampColumn: 'clicked_at' },
  ],
  hannazuki: [
    { site: 'fanspedia.net', table: 'sponsor_clicks_hannazuki', timestampColumn: 'clicked_at' },
    { site: 'onlyamericanfans.com', table: 'sponsor_clicks_hannazuki_oaf', timestampColumn: 'clicked_at' },
    { site: 'onlyaussiefans.com', table: 'sponsor_clicks_oaussief_hannazuki', timestampColumn: 'clicked_at' },
  ],
};

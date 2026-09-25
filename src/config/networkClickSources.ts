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
// (rocketreynaxo, hannazuki), and 2026-08-21 (cosplaytsumiko — fanspedia + onlyaussiefans; her
// onlyamericanfans leg, live from 2026-08-27, was added on 2026-09-19 after it had been missing
// from the panel: 142 rows in sponsor_clicks_cosplaytsumiko_oaf at the time).
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
  // Campaign removed 2026-09-19, so she no longer has an entry in sponsors.ts — which is where
  // panelStats normally reads findbyface's own table from. Her findbyface leg is listed here
  // instead so her panel keeps reporting it alongside the sister sites.
  cosplaytsumiko: [
    { site: 'findbyface.org', table: 'sponsor_clicks_cosplaytsumiko_fbf', timestampColumn: 'created_at' },
    { site: 'fanspedia.net', table: 'sponsor_clicks_cosplaytsumiko', timestampColumn: 'clicked_at' },
    { site: 'onlyamericanfans.com', table: 'sponsor_clicks_cosplaytsumiko_oaf', timestampColumn: 'clicked_at' },
    { site: 'onlyaussiefans.com', table: 'sponsor_clicks_oaussief_cosplaytsumiko', timestampColumn: 'clicked_at' },
  ],
  // 2026-08-28: all three sister-site legs live. Each table was probed via REST before being
  // added here (fanspedia 6 rows, onlyamericanfans 13, onlyaussiefans 1 at the time); names
  // copied from each sibling repo's sponsor config (onlyamericanfans:
  // src/config/sponsor-overrides.ts, onlyaussiefans: src/config/sponsors.ts). findbyface's own
  // sponsor_clicks_rinayanami_fbf still comes from sponsors.ts, as for every client.
  rinayanami: [
    { site: 'fanspedia.net', table: 'sponsor_clicks_rinayanami', timestampColumn: 'clicked_at' },
    { site: 'onlyamericanfans.com', table: 'sponsor_clicks_rinayanami_oaf', timestampColumn: 'clicked_at' },
    { site: 'onlyaussiefans.com', table: 'sponsor_clicks_oaussief_rinayanami', timestampColumn: 'clicked_at' },
  ],
  // 2026-09-26: shares a panel login with emilylopz (same client). Her findbyface leg is NOT
  // listed here — panelStats reads it from sponsors.ts like every other client — but note that
  // sponsor_clicks_sophiescrts_fbf did not exist when this was added (migrations/029 was never
  // run), so that leg reports nothing until it is. Legs below probed via REST on 2026-09-26:
  // fanspedia 40 rows, onlyaussiefans 147, onlybritishfans 0 (table freshly created). She has
  // no onlyamericanfans campaign, so there is no _oaf leg.
  sophiescrts: [
    { site: 'fanspedia.net', table: 'sponsor_clicks_sophiescrts', timestampColumn: 'clicked_at' },
    { site: 'onlyaussiefans.com', table: 'sponsor_clicks_oaussief_sophiescrts', timestampColumn: 'clicked_at' },
    { site: 'onlybritishfans.com', table: 'sponsor_clicks_obf_sophiescrts', timestampColumn: 'clicked_at' },
  ],
};

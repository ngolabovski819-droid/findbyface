// Display helpers shared by the panel's activity tables — the full log in
// src/pages/panel/activity.astro and the dashboard's "Recent activity" card in
// src/pages/panel/index.astro. Moved out of activity.astro's frontmatter on 2026-08-28 when the
// dashboard started rendering the same guest columns (when/site/location/referrer/user agent/IP).

export function formatLocation(city: string | null, country: string | null): string {
  if (city && country) return `${city}, ${country}`;
  return city || country || '—';
}

// A raw UA string is 100-150+ characters — never going to fit a table cell. Parses out just
// "Browser X on OS Y" for the visible cell; the full raw string stays available via the title
// attribute (native hover tooltip) for when the exact detail matters — e.g. spotting a
// specific outdated-OS pattern repeating suspiciously across many rows, the way the
// iPhone-OS-13_2_3 bot cluster got caught. Best-effort, not exhaustive — falls back to
// "Browser" / "OS" rather than guessing wrong on an unrecognized string.
export function parseUserAgent(ua: string | null): string {
  if (!ua) return '—';

  let os = 'OS';
  const ios = ua.match(/(?:iPhone|iPad|iPod).*?OS (\d+[_.]\d+)/);
  const android = ua.match(/Android (\d+(?:\.\d+)?)/);
  const mac = ua.match(/Mac OS X (\d+[_.]\d+)/);
  if (ios) os = `iOS ${ios[1].replace('_', '.')}`;
  else if (android) os = `Android ${android[1]}`;
  else if (/Windows NT 10\.0/.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT/.test(ua)) os = 'Windows';
  else if (mac) os = `macOS ${mac[1].replace('_', '.')}`;
  else if (/Linux/.test(ua)) os = 'Linux';

  let browser = 'Browser';
  const crIos = ua.match(/CriOS\/(\d+)/);
  const fxIos = ua.match(/FxiOS\/(\d+)/);
  const edgIos = ua.match(/EdgiOS\/(\d+)/);
  const gsa = ua.match(/GSA\/([\d.]+)/);
  const edg = ua.match(/Edg\/(\d+)/);
  const opr = ua.match(/OPR\/(\d+)/);
  const samsung = ua.match(/SamsungBrowser\/(\d+)/);
  const oem = ua.match(/(HeyTapBrowser|MiuiBrowser|YaBrowser)\/(\d+)/);
  const firefox = ua.match(/Firefox\/(\d+)/);
  const chrome = ua.match(/Chrome\/(\d+)/);
  const safari = ua.match(/Version\/(\d+).*Safari/);

  if (crIos) browser = `Chrome ${crIos[1]}`;
  else if (fxIos) browser = `Firefox ${fxIos[1]}`;
  else if (edgIos) browser = `Edge ${edgIos[1]}`;
  else if (gsa) browser = `Google App ${gsa[1]}`;
  else if (edg) browser = `Edge ${edg[1]}`;
  else if (opr) browser = `Opera ${opr[1]}`;
  else if (samsung) browser = `Samsung Internet ${samsung[1]}`;
  else if (oem) browser = `${oem[1]} ${oem[2]}`;
  else if (firefox) browser = `Firefox ${firefox[1]}`;
  else if (safari && !chrome) browser = `Safari ${safari[1]}`;
  else if (chrome) browser = `Chrome ${chrome[1]}`;
  else if (/Safari/.test(ua)) browser = 'Safari';

  return `${browser} on ${os}`;
}

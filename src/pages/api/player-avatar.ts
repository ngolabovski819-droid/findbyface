import type { APIRoute } from 'astro';

export const prerender = false;

const palettes = [
  ['#7657ff', '#ec54ba', '#ffe2f3'],
  ['#1677ff', '#22d3ee', '#dcfbff'],
  ['#f97316', '#facc15', '#fff1cc'],
  ['#10b981', '#5eead4', '#d9fff6'],
  ['#d946ef', '#8b5cf6', '#f3dcff'],
  ['#ef4444', '#fb7185', '#ffe1e5'],
  ['#6366f1', '#60a5fa', '#e1ebff'],
  ['#a855f7', '#f472b6', '#fbe3ff'],
] as const;

export const GET: APIRoute = ({ url }) => {
  const requested = Math.trunc(Number(url.searchParams.get('style')) || 1);
  const style = Math.min(Math.max(requested, 1), palettes.length);
  const [start, end, face] = palettes[style - 1];
  const eyeVariant = style % 3;
  const accessory = style % 2 === 0
    ? '<path d="M24 19 32 8l8 11" fill="none" stroke="rgba(255,255,255,.82)" stroke-width="3.5" stroke-linejoin="round"/>'
    : '<path d="M21 17c5-6 17-6 22 0" fill="none" stroke="rgba(255,255,255,.82)" stroke-width="3.5" stroke-linecap="round"/>';
  const eyes = eyeVariant === 0
    ? '<circle cx="26" cy="31" r="2.5"/><circle cx="38" cy="31" r="2.5"/>'
    : eyeVariant === 1
      ? '<path d="m23 31 5-1M36 30l5 1" stroke-width="3" stroke-linecap="round"/>'
      : '<path d="M23 30h6M35 30h6" stroke-width="3" stroke-linecap="round"/>';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Player avatar ${style}">
    <defs><linearGradient id="g" x1="8" y1="4" x2="57" y2="61" gradientUnits="userSpaceOnUse"><stop stop-color="${start}"/><stop offset="1" stop-color="${end}"/></linearGradient></defs>
    <rect width="64" height="64" rx="20" fill="url(#g)"/>
    <circle cx="32" cy="33" r="19" fill="${face}" fill-opacity=".94"/>
    ${accessory}
    <g fill="none" stroke="#302640">${eyes}<path d="M26 40c3.7 3.2 8.3 3.2 12 0" stroke-width="2.8" stroke-linecap="round"/></g>
    <circle cx="17" cy="15" r="5" fill="rgba(255,255,255,.2)"/>
    <path d="M9 54c8-7 15-10 23-10s15 3 23 10v10H9Z" fill="rgba(28,20,45,.28)"/>
  </svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};

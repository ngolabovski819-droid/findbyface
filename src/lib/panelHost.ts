// Shared Host-header logic for panel.findbyface.net — used by src/middleware.ts (deciding
// whether to rewrite a bare path to /panel/*) and by anything server-side that needs to build
// a panel link/redirect that reads clean on the subdomain but still resolves on the
// findbyface.net/panel/* fallback path (PanelLayout's nav, admin cross-links, etc.).
export function isPanelHost(host: string): boolean {
  const bareHost = host.split(':')[0].toLowerCase();
  // Keep recognizing the old host during the transition; Vercel redirects it in production.
  return bareHost === 'panel.findbyface.net'
    || bareHost === 'panel.findbyface.org'
    || bareHost === 'panel.localhost';
}

// '' on the panel subdomain (so links read as /activity/, not /panel/activity/), '/panel'
// everywhere else.
export function panelBase(request: Request): string {
  return isPanelHost(request.headers.get('host') || '') ? '' : '/panel';
}

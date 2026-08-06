// Routes panel.findbyface.org to the /panel pages while keeping them reachable at
// findbyface.org/panel/* too (useful before the subdomain is attached in Vercel, and it's
// what /api/panel/* calls resolve against either way). Astro has no native multi-domain
// concept — it matches routes purely on pathname — so this middleware is what decides, based
// on the Host header, to rewrite a bare path like "/login" into "/panel/login" before the
// router resolves it.
//
// This is also where /panel/* sessions get verified: real httpOnly-cookie auth (see
// src/lib/panelAuth.ts), not the consumer site's localStorage pattern, because this gates a
// client's actual business data rather than a soft UX paywall.
import { defineMiddleware } from 'astro:middleware';
import { verifyPanelSession, loginPathFor, dashboardPathFor } from './lib/panelAuth';
import { isPanelHost } from './lib/panelHost';

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url, cookies, locals } = context;
  const onPanelHost = isPanelHost(request.headers.get('host') || '');

  // Rewrite bare paths on the panel host into /panel/* — but never /api/* (those routes
  // already live at their real paths, e.g. a page's fetch('/api/panel/stats') must resolve
  // as-is) and never something that's already under /panel (avoids a double prefix).
  let pathname = url.pathname;
  if (onPanelHost && !pathname.startsWith('/api/') && !pathname.startsWith('/panel')) {
    pathname = pathname === '/' ? '/panel' : `/panel${pathname}`;
  }

  const isPanelPage = pathname.startsWith('/panel') && !pathname.startsWith('/api/');
  const isPanelApi = pathname.startsWith('/api/panel/');

  if (isPanelPage || isPanelApi) {
    const session = await verifyPanelSession(cookies);
    if (session) Object.assign(locals, { panelUser: session });

    const isLoginPage = pathname === '/panel/login' || pathname === '/panel/login/';
    if (isPanelPage && !isLoginPage && !session) {
      return context.redirect(loginPathFor(onPanelHost), 302);
    }
    if (isPanelPage && isLoginPage && session) {
      return context.redirect(dashboardPathFor(onPanelHost), 302);
    }
  }

  if (pathname !== url.pathname) {
    return context.rewrite(pathname + url.search);
  }

  return next();
});

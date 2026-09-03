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
import { isAllowedImageRequest } from './utils/image';

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url, cookies, locals } = context;

  // Creator photos come through Astro's `/_image` sharp endpoint (src/utils/image.ts).
  // Two jobs here, handled first so the panel-host rewrite below never turns the path
  // into /panel/_image (Astro also answers `/_image/`, hence the trailing-slash trim):
  //   1. Only accept the exact URL shape `proxyImg` emits — an allowlisted OnlyFans host
  //      and one of the site's own sizes. Astro's endpoint would otherwise also proxy
  //      same-origin paths and resize to any dimensions anyone asks for.
  //   2. Astro only sets a browser `Cache-Control: max-age`, and Vercel's CDN caches
  //      function responses solely on an `s-maxage`, so without this header every image
  //      request would run the Frankfurt function again.
  if (url.pathname.replace(/\/+$/, '') === '/_image') {
    if (!isAllowedImageRequest(url.searchParams)) {
      return new Response('Bad Request', { status: 400 });
    }
    const response = await next();
    if (response.ok) {
      response.headers.set('CDN-Cache-Control', 'public, s-maxage=31536000, immutable');
    }
    return response;
  }

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

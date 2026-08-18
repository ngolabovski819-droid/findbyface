export const SITE = 'https://findbyface.org';

/** Absolute URL on the canonical origin, always with the origin from SITE. */
export const absUrl = (path: string) => new URL(path, SITE).href;

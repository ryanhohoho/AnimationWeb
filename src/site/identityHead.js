// identityHead.js — identity.js, as the tags a head needs
//
// Pure: strings in, a string out, so the build (vite.config.js), the router and
// the tests all use the same code and none of it needs a DOM.

/** what goes inside an attribute or a <title>: the four characters that can end one */
export const escHtml = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** the tab's name on a page that is not Home. A pattern with no {page} in it is
    taken as the name itself, for every page, rather than silently dropping the
    page's name onto nothing. */
export function tabTitle(site, page) {
  const pat = String(site?.pageTitle || "{page}");
  return pat.includes("{page}") ? pat.split("{page}").join(String(page)) : pat;
}

/** a path in public/ as the URL a scraper should fetch: absolute when the
    site's address is known, with `?v=` when the file's contents are, so a card
    or icon that changes is fetched again rather than served from a scraper's
    cache under the old name */
export function publicUrl(site, path, version) {
  const base = String(site?.url || "").replace(/\/+$/, "");
  return `${base}${path}${version ? `?v=${version}` : ""}`;
}

const IMAGE_TYPE = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

/**
 * Every identity tag for index.html's head.
 * @param id       { SITE, PREVIEW, ICON } from identity.js
 * @param files    which of public/'s icon files exist, and a short content hash
 *                 for each: { "favicon.svg": "1a2b3c4d", ... }. A file that is
 *                 not there is not linked -- an uploaded raster icon has no svg.
 */
export function identityHead({ SITE, PREVIEW }, files = {}) {
  const a = escHtml;
  const has = (f) => Object.prototype.hasOwnProperty.call(files, f);
  const v = (f) => files[f] || "";
  // the icons are same-origin and always relative: a tab mark fetched from the
  // production domain while running locally would show the LIVE icon, not the
  // one being edited
  const icon = (f) => `/${f}${v(f) ? `?v=${v(f)}` : ""}`;
  const img = String(PREVIEW.image || "/og.png");
  const imgFile = img.replace(/^\//, "");
  const ext = (/\.[a-z]+$/i.exec(img)?.[0] || "").toLowerCase();
  const out = [
    `<title>${a(SITE.title)}</title>`,
    `<meta name="description" content="${a(SITE.description)}" />`,
    `<meta name="author" content="${a(SITE.author)}" />`,
    // the name under the icon on a phone's home screen: iOS reads the first,
    // Android and Windows the second; without them both take the tab's title
    `<meta name="apple-mobile-web-app-title" content="${a(SITE.siteName)}" />`,
    `<meta name="application-name" content="${a(SITE.siteName)}" />`,
    // sizes on the .ico, or Chrome picks it over the svg (a long-standing
    // Chrome bug; the evilmartians "how to favicon" note is the reference)
    has("favicon.ico") && `<link rel="icon" href="${icon("favicon.ico")}" sizes="32x32" />`,
    has("favicon.svg") && `<link rel="icon" href="${icon("favicon.svg")}" type="image/svg+xml" />`,
    has("favicon-32.png") && `<link rel="icon" href="${icon("favicon-32.png")}" sizes="32x32" type="image/png" />`,
    has("favicon-192.png") && `<link rel="icon" href="${icon("favicon-192.png")}" sizes="192x192" type="image/png" />`,
    has("apple-touch-icon.png") && `<link rel="apple-touch-icon" href="${icon("apple-touch-icon.png")}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${a(SITE.siteName)}" />`,
    `<meta property="og:title" content="${a(PREVIEW.title)}" />`,
    `<meta property="og:description" content="${a(PREVIEW.description)}" />`,
    SITE.url && `<meta property="og:url" content="${a(publicUrl(SITE, "/"))}" />`,
    `<meta property="og:image" content="${a(publicUrl(SITE, img, v(imgFile)))}" />`,
    IMAGE_TYPE[ext] && `<meta property="og:image:type" content="${IMAGE_TYPE[ext]}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${a(PREVIEW.imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`
  ];
  return out.filter(Boolean).join("\n  ");
}

/** the files identityHead() may link, in public/ */
export const IDENTITY_FILES = ["favicon.ico", "favicon.svg", "favicon-32.png", "favicon-192.png",
  "apple-touch-icon.png", "og.png", "og.jpg"];

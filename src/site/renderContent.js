// renderContent.js
// content DATA -> semantic DOM. no innerHTML, no markup strings, no markdown
// pipeline (IMPLEMENTATION_PLAN.md risk register: "scope creep into a full
// CMS" is explicitly a risk to avoid). createElement all the way down.
//
// this is deliberately NOT src/site/dom.js. dom.js is phase 4's file in the
// target module layout ("builds the semantic DOM from content data", built
// alongside words.js so the field can resolve per-word slots into it) and
// this router doesn't touch the type layer. this module is the plain,
// slot-less version the router needs to have SOMETHING real and accessible in
// #route-outlet before phase 4 exists; router.js takes it as an injectable
// `render` option specifically so phase 4 can swap it out later without
// touching router.js at all.
//
// bible 7.1: #doc is the layout + accessibility layer. every element made
// here is a real heading / paragraph / link / list -- reflowable, focusable,
// selectable, readable by a screen reader. index.html paints its text
// transparent; that is a CSS decision made above this module, not something
// this module needs to know about.

/** one <article> per route: an <h1>, then heading/body/list per section. */
export function renderRoute(content) {
  const article = document.createElement("article");

  const h1 = document.createElement("h1");
  h1.textContent = content.title;
  article.appendChild(h1);

  for (const section of content.sections || []) {
    if (section.heading) {
      const h2 = document.createElement("h2");
      h2.textContent = section.heading;
      article.appendChild(h2);
    }
    for (const line of section.body || []) {
      const p = document.createElement("p");
      p.textContent = line;
      article.appendChild(p);
    }
    if (section.list && section.list.length) {
      const ul = document.createElement("ul");
      for (const item of section.list) {
        const li = document.createElement("li");
        li.textContent = item;
        ul.appendChild(li);
      }
      article.appendChild(ul);
    }
  }
  return article;
}

/**
 * the persistent nav, built ONCE by router.start() and never rebuilt on
 * navigation -- only its aria-current is touched (see router.js
 * updateNavActive). routes without a navLabel (the 404) are never linked.
 */
export function renderNav(routes) {
  const nav = document.createElement("nav");
  nav.setAttribute("aria-label", "primary");
  const ul = document.createElement("ul");
  for (const route of routes) {
    if (!route.navLabel) continue;
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = route.path;
    a.textContent = route.navLabel;
    li.appendChild(a);
    ul.appendChild(li);
  }
  nav.appendChild(ul);
  return nav;
}

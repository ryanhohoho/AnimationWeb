// not-found.js
// the router's 404. NOT part of the nav (see router.js: notFoundRoute is kept
// out of the `routes` table on purpose), reached only when a path doesn't
// match one of the four real routes.

export default {
  id: "not-found",
  navLabel: null,
  title: "Not Found",
  sections: [
    {
      heading: "[placeholder]",
      body: [
        "[PLACEHOLDER COPY] There's nothing at this address. Real copy (and " +
          "possibly a field-driven easter egg) arrives in phase 9."
      ]
    }
  ]
};

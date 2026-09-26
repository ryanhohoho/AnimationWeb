// mewPresence.js — WHERE THE ANIMAL IS
//
// By instruction (2026-09-25) Mew is on the four cards and not on the project
// sheets: a project sheet is the work, and she stays out of its way. This is
// the whole rule, in one place so it can be checked (test/router.test.mjs):
//
//   · every page tells her whether she is away (`mewsleep` on the bus);
//     src/mew.js stops her clock once she is out of sight, and starts it again
//     when she is not away, so she comes back by the side entrance every new
//     sheet already gives her;
//   · the ENGINE is fetched on the first page that is one of the four cards,
//     and never before -- a shared link to a project sheet does not download
//     800 KB of an animal that is not on it;
//   · and if that first card is not the first page of the visit, she was never
//     on screen, so she arrives from the side (`enter`) rather than appearing in
//     the middle of the window.
//
// Reduced motion never boots her at all (utils/motion.js has the argument).

/**
 * @param world    the shared bus
 * @param boot     ({ enter }) => void, which fetches and starts the engine
 * @param reduced  the reader asked for less motion
 * @returns        onRoute(route), to call on every committed page
 */
export function createMewPresence({ world, boot, reduced = false }) {
  let booted = false;
  let first = true;
  return function onRoute(route) {
    const away = route?.name === "project";
    world?.emit?.("mewsleep", { sleep: away });
    if (!away && !booted && !reduced) {
      booted = true;
      boot({ enter: !first });
    }
    first = false;
  };
}

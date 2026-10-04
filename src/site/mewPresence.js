// mewPresence.js — WHERE THE ANIMAL IS
//
// By instruction Mew is on HOME and CONTACT and nowhere else (Home only from
// 2026-09-26; Contact joined on 2026-10-04; before that she was on all four
// cards): every other page is something to read, and she stays out of its
// way. She leaves Home through its crossings; she leaves Contact by fading out
// with the page on a turn (src/mew.js, `navigating`) or by the same flight as
// Home when the move back to Home crosses. This is the whole rule, in one
// place so it can be checked (test/router.test.mjs):
//
//   · every page tells her whether she is away (`mewsleep` on the bus);
//     src/mew.js stops her clock once she is out of sight, and starts it again
//     when she is not away, so she comes back by the side entrance every new
//     sheet already gives her;
//   · the ENGINE is fetched the first time the visit reaches one of her pages,
//     and never before -- a shared link to any other page does not download
//     800 KB of an animal that is not on it;
//   · and if her page is not the first page of the visit, she was never on
//     screen, so she arrives from the side (`enter`) rather than appearing in
//     the middle of the window.
//
// Reduced motion never boots her at all (utils/motion.js has the argument).

/**
 * @param world    the shared bus
 * @param boot     ({ enter }) => void, which fetches and starts the engine
 * @param reduced  the reader asked for less motion
 * @returns        onRoute(route), to call on every committed page
 */
/** the pages she lives on */
export const MEW_PAGES = new Set(["home", "contact"]);

export function createMewPresence({ world, boot, reduced = false }) {
  let booted = false;
  let first = true;
  return function onRoute(route) {
    const away = !MEW_PAGES.has(route?.name);
    world?.emit?.("mewsleep", { sleep: away });
    if (!away && !booted && !reduced) {
      booted = true;
      boot({ enter: !first });
    }
    first = false;
  };
}

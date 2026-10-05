// music.js — THE ALBUMS ON THE ABOUT CARD'S WHEEL
//
// HAND-WRITTEN. One line per album, in any order (the wheel orders them by
// release date, byRelease below): paste the album's Spotify link (Share ->
// Copy link to album) and nothing else. Then run
//
//   npm run music          (= node tools/bake_music.mjs)
//
// which asks Spotify's public oEmbed endpoint for each album's name and cover,
// and writes the covers to src/assets/music/ (<id>.webp) and the names to
// src/assets/music/albums.json. Both are generated -- do not edit them; they
// are read through a glob, so a missing cover is a blank sleeve, not an error.
//
// `name` is optional and wins over the one Spotify gives (oEmbed names the
// album, not the artist: "Blonde" rather than "Blonde · Frank Ocean").
//
// While this list is empty the wheel turns through blank sleeves, so the card
// has its shape before it has its records.
//
//   { spotify: "https://open.spotify.com/album/4xkM0BwLM9H2IUcbYzpcBI" },
//   { spotify: "https://open.spotify.com/album/...", name: "an album · its artist" },

export const MUSIC = [
  { spotify: "https://open.spotify.com/album/61ztlk3IamUgahgX4VPisJ" },
  { spotify: "https://open.spotify.com/album/2LKW0m9cC63QzEI9tJH3ql" },
  { spotify: "https://open.spotify.com/album/3IwmHrw566MMhJk0hsIZrQ" },
  { spotify: "https://open.spotify.com/album/2xpgb8R0BXVS2e1XnXI9xZ" },
  { spotify: "https://open.spotify.com/album/2nkto6YNI4rUYTLqEwWJ3o" },
  { spotify: "https://open.spotify.com/album/2jX6yKrWw9bY7JAYHhhtqZ" },
  { spotify: "https://open.spotify.com/album/3VQkNrG74QPY4rHBPoyZYZ" },
  { spotify: "https://open.spotify.com/album/2k4FmEtXR0WiDW0Ac2QArT" },
  { spotify: "https://open.spotify.com/album/5ktP3Kld7AkIWr6yXUaTbn" },
  { spotify: "https://open.spotify.com/album/0JGOiO34nwfUdDrD612dOp" },
  { spotify: "https://open.spotify.com/album/01MRGgNbfWrE291tQjw9ta" },
  { spotify: "https://open.spotify.com/album/2GjMqRvYHbvtEoTA1CGeRd" },
  { spotify: "https://open.spotify.com/album/1CwmwmPdt0SfRRHTHsje4H" },
  { spotify: "https://open.spotify.com/album/7CBwpeVQ27cWwyEYjByVH1" },
  { spotify: "https://open.spotify.com/album/392p3shh2jkxUxY2VHvlH8" },
  { spotify: "https://open.spotify.com/album/5XpEKORZ4y6OrCZSKsi46A" },
  { spotify: "https://open.spotify.com/album/3lyRrGhXCCMbt4jVO9Wur2" },
  { spotify: "https://open.spotify.com/album/4iOj6nJVkB4K9nbfLFIHC0" },
  { spotify: "https://open.spotify.com/album/2zEdi42kfgLEySoikGJMFT" },
  { spotify: "https://open.spotify.com/album/2k3ICqEXZR7jmZESOqXxWx" },
  { spotify: "https://open.spotify.com/album/1tzfA5Po3zdgq3vex66DKg" },
  { spotify: "https://open.spotify.com/album/3OxfaVgvTxUTy7276t7SPU" },
  { spotify: "https://open.spotify.com/album/0P3oVJBFOv3TDXlYRhGL7s" },
  { spotify: "https://open.spotify.com/album/5WQjKVRI7Kb6RyeAeS16UY" },
  { spotify: "https://open.spotify.com/album/07w0rG5TETcyihsEIZR3qG" },
  { spotify: "https://open.spotify.com/album/4N1fROq2oeyLGAlQ1C1j18" },
  { spotify: "https://open.spotify.com/album/0hvT3yIEysuuvkK73vgdcW" },
  { spotify: "https://open.spotify.com/album/0BOp6BSkFIfrUPaAOu2VgL" },
  { spotify: "https://open.spotify.com/album/18iFxjZugvKhuNNMbLjZJF" },
  { spotify: "https://open.spotify.com/album/1AzP7NB0qSSJJSLX9ZQe98" },
  { spotify: "https://open.spotify.com/album/5zi7WsKlIiUXv09tbGLKsE" },
  { spotify: "https://open.spotify.com/album/10IdwJTZdXSdDe3XEeTehk" },
  { spotify: "https://open.spotify.com/album/0qivAWPVFSOgfoMlHv5QKo" },
  { spotify: "https://open.spotify.com/album/3o81FH5FTYVtoBQOZr3T7y" },
  { spotify: "https://open.spotify.com/album/03guxdOi12XJbnvxvxbpwG" },
  { spotify: "https://open.spotify.com/album/3bu3fyvtURUF34oFHBvxeJ" },
  { spotify: "https://open.spotify.com/album/7xYiTrbTL57QO0bb4hXIKo" },
  { spotify: "https://open.spotify.com/album/0g56OJU53oUbiCWB99D5S5" },
  { spotify: "https://open.spotify.com/album/2V2VAi4Rb2aDUWBtSvICMR" },
  { spotify: "https://open.spotify.com/album/3xA110ttA5PDmnDIBoyb7b" },
  { spotify: "https://open.spotify.com/album/3MaikI62Ap7RbrBSE0i4AU" },
  { spotify: "https://open.spotify.com/album/0U28P0QVB1QRxpqp5IHOlH" },
  { spotify: "https://open.spotify.com/album/1pA41oXgGGW6ff6N1sZnjN" },
  { spotify: "https://open.spotify.com/album/4DcPwya8rBVECuD9xcpTXx" },
  { spotify: "https://open.spotify.com/album/6PM2d4YZxyXLO05TWXoSm7" },
  { spotify: "https://open.spotify.com/album/4A0z5IbwE1wQZzY1W9lr1s" },
  { spotify: "https://open.spotify.com/album/5pwhf4kv2qX10i6k2uJsFp" },
  { spotify: "https://open.spotify.com/album/5T0Gt5JYXh6gEttuB8ujML" },
];

// ── WHAT THE PAGE READS ───────────────────────────────────────────────────
/** a Spotify link -> its kind and id ({ kind: "album", id }), or null */
export function spotifyId(url) {
  const m = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(album|track|playlist|artist)\/([A-Za-z0-9]{10,40})/.exec(String(url || ""));
  return m ? { kind: m[1], id: m[2] } : null;
}

/**
 * The wheel's list: every line of MUSIC that is a real Spotify link, with its
 * name and cover where the bake has made them. Pure, so it is checked in node.
 * @param list    MUSIC
 * @param covers  { id: url } from the glob
 * @param names   { id: { title } } from albums.json
 */
export function albums(list, covers = {}, names = {}) {
  const out = [];
  for (const it of list || []) {
    const s = spotifyId(it?.spotify);
    if (!s) continue;
    out.push({
      id: s.id,
      url: `https://open.spotify.com/${s.kind}/${s.id}`,
      title: String(it.name || names[s.id]?.title || ""),
      released: String(names[s.id]?.released || ""),
      cover: covers[s.id] || null
    });
  }
  return out;
}

/**
 * THE WHEEL'S ORDER, BY RELEASE DATE (owner's instruction, 2026-10-05): the
 * newest in front, the second newest one below it, the third one above it,
 * and so on alternating, so turning either way goes back in time and the
 * two oldest meet at the back of the circle. (On the wheel the album after
 * the front one is the one BELOW it: aboutMusic.js turns the drum by +1 for
 * ArrowDown.) So rank r goes to place 0, 1, n-1, 2, n-2, ... An album with
 * no date yet counts as the oldest; equal dates keep music.js's order.
 */
export function byRelease(list) {
  const n = list.length;
  const ranked = list.map((a, i) => ({ a, i })).sort((x, y) =>
    (y.a.released || "").localeCompare(x.a.released || "") || x.i - y.i);
  const out = new Array(n);
  ranked.forEach(({ a }, r) => { out[r === 0 ? 0 : r % 2 ? (r + 1) / 2 : n - r / 2] = a; });
  return out;
}

const COVERS = Object.fromEntries(Object.entries(
  import.meta.glob("../assets/music/*.webp", { eager: true, query: "?url", import: "default" })
).map(([p, u]) => [p.slice(p.lastIndexOf("/") + 1, -5), u]));
const NAMES = Object.values(import.meta.glob("../assets/music/albums.json", { eager: true, import: "default" }))[0] || {};

export const ALBUMS = byRelease(albums(MUSIC, COVERS, NAMES));

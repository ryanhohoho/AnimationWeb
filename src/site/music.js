// music.js — THE ALBUMS ON THE ABOUT CARD'S WHEEL
//
// HAND-WRITTEN. One line per album, in the order the wheel turns through them:
// paste the album's Spotify link (Share -> Copy link to album) and nothing
// else. Then run
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
      cover: covers[s.id] || null
    });
  }
  return out;
}

const COVERS = Object.fromEntries(Object.entries(
  import.meta.glob("../assets/music/*.webp", { eager: true, query: "?url", import: "default" })
).map(([p, u]) => [p.slice(p.lastIndexOf("/") + 1, -5), u]));
const NAMES = Object.values(import.meta.glob("../assets/music/albums.json", { eager: true, import: "default" }))[0] || {};

export const ALBUMS = albums(MUSIC, COVERS, NAMES);

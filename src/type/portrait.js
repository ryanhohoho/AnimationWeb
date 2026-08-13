// portrait.js
// the hero portrait's playback half (design bible 4.5). tools/portrait.py
// bakes a still image or a short clip into a fixed COLS x ROWS grid of glyph
// ids, delta-encoded between frames ("most cells do not change"), and this
// module replays that pack at 12 fps.
//
// Split the same way atlas.js is: everything below is PURE except
// `loadPortraitPack`, which is the one fetch-based function -- so the decode
// math and the player's frame timing are checkable headlessly in
// test/type.test.js, the only way "decode cost < 0.2 ms/frame" (plan phase 7)
// gets to be a measurement instead of a guess.
//
// tools/portrait.py's `decode_all` is the reference decoder; `applyDelta`
// below is its JS mirror, one frame at a time -- the same split this codebase
// already uses for match.js (mirrored by tools/gen_match_fixture.py) and
// fieldMath.js (mirrored in GLSL). tools/check_type.py cross-checks an
// independent third decoder against both, on the shipped files.
//
// THE PACK FORMAT (see tools/portrait.py's module docstring for the authoring
// side): frame 0 is `cols*rows` raw glyph-id bytes; every frame after it is
//   uint16 changedCount (LE)
//   changedCount x (uint16 cellIndex LE, uint8 glyphId)
// `header.offsets[i]` is frame i's byte offset into the packed buffer.
//
// WHAT "INTO THE FIELD'S BUFFERS" MEANS HERE: this module owns no GPU object
// (same rule as grid.js / match.js / atlas.js's pure half -- fieldRenderer.js
// is the only place that allocates one). `createPortraitPlayer` decodes each
// due frame straight into a caller-supplied Uint8Array, so whoever owns the
// portrait's small data texture (a pair of buffers shaped exactly like
// fieldRenderer.js's cellA/cellB) can hand that backing store in directly and
// re-upload it with texSubImage2D after `update()` reports a new frame -- no
// intermediate copy, no per-frame allocation.

/**
 * apply ONE frame's delta to `buffer` (mutated in place) and return the
 * number of bytes consumed, so a caller stepping through several frames can
 * advance its own offset without re-deriving it from `header.offsets`.
 *
 * `packed` is the full Uint8Array pack; `byteOffset` is where this frame's
 * block starts (`header.offsets[i]`).
 */
export function applyDelta(buffer, packed, byteOffset) {
  const view = new DataView(packed.buffer, packed.byteOffset + byteOffset,
                             packed.byteLength - byteOffset);
  const count = view.getUint16(0, true);
  let o = 2;
  for (let k = 0; k < count; k++) {
    const idx = view.getUint16(o, true); o += 2;
    const gid = view.getUint8(o); o += 1;
    buffer[idx] = gid;
  }
  return o;
}

/** frame 0 is stored raw, not as a delta -- seed (or reseed, on loop) `buffer`
 *  with it directly. */
export function seedFrame0(buffer, packed, cellCount) {
  buffer.set(packed.subarray(0, cellCount));
}

/** the byte length of frame i's own block, for callers that want to validate
 *  a pack's `offsets` table without decoding it (tools/check_type.py's JS
 *  mirror, test/type.test.js). */
export function frameBlockLength(header, i) {
  const [cols, rows] = header.grid;
  if (i === 0) return cols * rows;
  const start = header.offsets[i];
  const end = i + 1 < header.frames ? header.offsets[i + 1] : header.byteLength;
  return end - start;
}

/**
 * createPortraitPlayer({ header, packed, buffer, scope }) -> player
 *
 * `buffer` is a caller-owned Uint8Array of length cols*rows -- "the field's
 * buffer" this player decodes into; it is never allocated here (see the
 * module header). `scope` (src/utils/lifecycle.js) registers the one piece of
 * cleanup this module needs: once torn down, `update()` becomes a no-op, so a
 * player outliving its route can never keep mutating a buffer whose backing
 * GPU texture is already disposed (lifecycle leak class 6).
 *
 * `update(dtSeconds)` advances playback by real elapsed time and returns
 * whether a new frame was decoded this call -- the caller's own job is to
 * re-upload `buffer` (e.g. texSubImage2D) only when it did, exactly the way
 * fieldRenderer.js's `writeRegion` is a separate call from advancing state.
 */
export function createPortraitPlayer({ header, packed, buffer, scope }) {
  const [cols, rows] = header.grid;
  const cellCount = cols * rows;
  if (buffer.length !== cellCount) {
    throw new Error(`portrait: buffer length ${buffer.length} does not match ` +
                     `grid ${cols}x${rows} (${cellCount} cells)`);
  }

  const frames = header.frames;
  // a single still frame plays nothing -- see update()'s early-out. Guarding
  // here too means `period` is never a divide-by-a-zero fps.
  const period = frames > 1 && header.fps > 0 ? 1 / header.fps : Infinity;

  let frameIndex = 0;
  let acc = 0;
  let disposed = false;

  function reseed() {
    seedFrame0(buffer, packed, cellCount);
  }
  reseed();

  function advanceOnce() {
    frameIndex = (frameIndex + 1) % frames;
    if (frameIndex === 0) { reseed(); return; }
    applyDelta(buffer, packed, header.offsets[frameIndex]);
  }

  /**
   * advance by real elapsed seconds. Ticks in whole `period` steps so
   * playback is frame-rate independent of the caller's own rAF rate, the
   * same invariant sim.test.js already holds expDamp to.
   *
   * THE CATCH-UP IS CAPPED at one full loop of the clip. A hidden tab or a
   * long stall produces one huge `dtSeconds` on resume; replaying every
   * missed frame in a single tick would either flash through the whole clip
   * (a strobe, bible 8's do-not-ship list) or block the main thread walking
   * hundreds of frames for a clip that is about to be looped anyway. Capping
   * at `frames` steps means the worst case is "the clip resumes from
   * wherever it would have looped back to", never a spin.
   */
  function update(dtSeconds) {
    if (disposed || frames <= 1) return false;
    acc += dtSeconds;
    let advanced = false;
    let guard = frames;
    while (acc >= period && guard-- > 0) {
      acc -= period;
      advanceOnce();
      advanced = true;
    }
    if (guard <= 0) acc = 0;
    return advanced;
  }

  function reset() {
    frameIndex = 0;
    acc = 0;
    reseed();
  }

  const api = {
    buffer,
    update,
    reset,
    get frameIndex() { return frameIndex; },
    get disposed() { return disposed; }
  };

  if (scope) scope.add(() => { disposed = true; });
  return api;
}

/** cellCount-sized Uint8Array a caller can hand to createPortraitPlayer, or
 *  skip in favour of a view over its own GPU-backed store. */
export function createPortraitBuffer(header) {
  const [cols, rows] = header.grid;
  return new Uint8Array(cols * rows);
}

// ---------------------------------------------------------------------------
// the one browser-only function in this module.
// ---------------------------------------------------------------------------

/** fetch the header + packed binary tools/portrait.py writes. Mirrors
 *  atlas.js's loadAtlasImage: plain data out, no GPU object touched here. */
export async function loadPortraitPack(jsonUrl, binUrl) {
  const [headerRes, binRes] = await Promise.all([fetch(jsonUrl), fetch(binUrl)]);
  if (!headerRes.ok) throw new Error(`portrait: failed to fetch ${jsonUrl} (${headerRes.status})`);
  if (!binRes.ok) throw new Error(`portrait: failed to fetch ${binUrl} (${binRes.status})`);
  const header = await headerRes.json();
  const packed = new Uint8Array(await binRes.arrayBuffer());
  return { header, packed };
}

export default { applyDelta, seedFrame0, frameBlockLength, createPortraitPlayer, createPortraitBuffer, loadPortraitPack };

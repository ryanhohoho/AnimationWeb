// SANDBOX ONLY (never installed in the live project). Takes for the portfolio's motion-graphics page.
//   ?clean            the whole piece with no words: no captions, no titles/wordfx printed in the picture (except the
//                     poster's SCIENCE.), no typing keys. Story beats are cut out of this render.
//   ?takes=montage    each devices-montage scene alone, at a take length, words stripped (SCIENCE. kept), with that
//                     scene's own part of the score sized to the take
//   ?takes=flower     every cut of "A flower." alone, extended, at the moment of the film it comes from
//   ?takes=sky        the sky tiles as one whole take: the firmament's clouds, then the turn to Francis
import { STORY } from './story.js';
import { CUES } from './audio/cues.js';
import { MONTAGE } from './timing.js';

const url = new URLSearchParams(location.search);
const CLEAN = url.has('clean') || url.has('takes');
if (CLEAN) globalThis.__CLEAN = true;

const WORDY = new Set(['title', 'wordfx']);
const stripPost = (post, keep = false) => (post || []).filter(([n]) => keep || !WORDY.has(n));

if (CLEAN) {
  for (const b of STORY.beats) {
    if (b.id === 'gate' || b.id === 'fin') continue;
    b.text = null;
    if (b.id === 'watch') b.params = { ...b.params, text: '', reveal: 0 };
    b.post = stripPost(b.post);
    for (const s of b.shots) {
      if ('text' in s) s.text = null;
      s.post = stripPost(s.post, b.id === 'devices' && s.scene === 'm_poster');
    }
  }
}

// every param that is a function of the shot state sees the BEAT clock held at the middle of the cut in the film, so
// the bloom stays exactly as open as that cut showed it (it would otherwise go on opening for the whole take and blow
// out to white); shot time and the shader's own clock still run, so thresholds settle and the flower still moves
const shift = (v, at) => (typeof v === 'function' ? (s) => v({ ...s, bt: at }) : v);
const shiftObj = (o, off) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, shift(v, off)]));
const shiftPost = (post, off) => post.map(([n, p]) => [n, shiftObj(p, off)]);
const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

// ── the montage: one scene's own block of the devices cue, placed at the take and sized to it ───────────────
// devices() reads every scene's start and length off MONTAGE; for one call the target starts at 0 and lasts the
// take, the scene after it (whose start ends some blocks) and the angels (whose start ends the 16th pulse) sit at
// the take's end, and everything else is parked far past the render, so none of it sounds.
function montagePart(name, len, turnAt) {
  return (a, t0) => {
    const at = MONTAGE.at, ln = MONTAGE.len, ta = MONTAGE.turnAt;
    const i = MONTAGE.order.indexOf(name), next = MONTAGE.order[i + 1];
    MONTAGE.at = (n) => (n === name ? 0 : (n === next || n === 'm_angels') ? len : 1e4);
    MONTAGE.len = (n) => (n === name ? len : 1);
    if (turnAt != null) MONTAGE.turnAt = turnAt;
    try { CUES.devices(a, t0, len); } finally { MONTAGE.at = at; MONTAGE.len = ln; MONTAGE.turnAt = ta; }
  };
}

const MONTAGE_TAKES = {
  m_wings: { len: 8 },
  m_credits: { len: 8 },
  m_skytiles: { len: 4.5, params: { turnAt: 1 }, turnAt: 1 },
  m_tower: { len: 6 },
  // "Dio vede tutto" poured in whole: the dots arrive, then the Lloyd relaxation plays out (the montage shows its
  // last 0.23 s)
  m_providence: { len: 9, params: { set: 0, form: (s) => ease(s.t / 4), relax: (s) => ease((s.t - 3.5) / 4), gaze: 0 } },
  m_particles: { len: 8 },
  m_chrome: { len: 8 },
  m_moire: { len: 8 },
  m_topo: { len: 8 },
  m_earth: { len: 8 },
  m_poster: { len: 5 },
  m_pool: { len: 10.5, params: { start: 1.5 } },
  m_desktop: { len: 3.5, params: { start: 0 } },
  m_angels: { len: 12.7 },
};

// ── "A flower.": one cut's own sound, from the flower cue, sized to the take ───────────────────────────────
function flowerPart(k, shots, off) {
  return (a, t0, dur) => {
    const nChain = 4, nFlick = shots.length - nChain - 1;
    const up12 = [62, 69, 73, 76, 78];            // Dmaj9 an octave up (cues.js CH.Dmaj9 + 12)
    if (k < nChain) {
      a.pad(up12, t0, dur, { gain: .06, cutoff: 2000, cutoffTo: 6000, attack: Math.min(2, dur * .5), release: .3, voices: 2, verb: .6, out: 'bus' });
      if (k > 0) a.shutter(t0, { gain: .13 });
      // the ticks the film plays under this cut (they multiply as the chain goes on), held at that rate
      let t = .05, gap = .2; while (t < off) { t += gap; gap = Math.max(gap * .86, .03); }
      for (let u = t0 + .05; u < t0 + dur - .1; u += gap) a.tone(u, 2000 + Math.random() * 3000, .03, { type: 'square', gain: .022, pan: Math.random() * 1.2 - .6, verb: .2 });
      if (k === nChain - 1) { a.bell(74, t0 + .05, { gain: .08, decay: 3, verb: .7 }); a.bell(81, t0 + .35, { gain: .07, decay: 3, verb: .7 }); }
    } else if (k < nChain + nFlick) {
      const i = k - nChain, d = shots[k].dur;
      if (i === 0) a.impact(t0, { gain: 1.1 });
      a.pad(up12, t0, dur, { gain: .2, cutoff: 7000, cutoffTo: 1600, attack: .01, release: .3, voices: 4, detune: 20, out: 'bus' });
      a.sub(38, t0, dur, { gain: .3, out: 'bus' });
      if (i === 0 || d > .12) a.kick(t0, { gain: .75 + d, pump: 0 });
      a.hat(t0, { gain: .06 + d * .2, pan: (i % 2 ? .35 : -.35) });
      a.pluck([50, 57, 61, 64, 66][1 + (i % 4)] + 24 + (i % 8 > 3 ? 12 : 0), t0, { gain: .06, decay: .12 + d, cutoff: 5000, out: 'bus', pan: Math.sin(i) * .6 });
      if (d < .08) a.glitch(t0, d, { density: .5, gain: .07 });
    } else {
      a.choir(up12, t0, dur, { gain: .2, attack: .03, release: 1.4 });
      a.bell(86, t0 + .03, { gain: .06, decay: 4, verb: .9 });
    }
  };
}
const FLOWER_TAKE = 4;

// ── the sky, whole: ONE take of m_skytiles from the first cloud to the black after Francis ─────────────────
// The piece shows this take twice and never whole: the firmament is its first 5 s (clouds only, cut before the
// turn), and the devices montage re-shows its start and the jerk round to the portrait. Here it runs straight
// through: the firmament's 5 s, the turn at exactly 5 s, and on until the frame before the scene's own cut to black
// (TURN.end after the turn). Sound: the firmament's digicam mic in the wind (without its J-cut to the whale, which
// belongs to the cut that follows it in the film), then the turn's sound exactly as the montage plays it.
const SKY = { turnAt: 5, len: 5 + 1.7 };
function skyPart(a, t0) {
  const quiet = new Proxy(a, { get: (o, k) => (k === 'sample' ? () => {} : typeof o[k] === 'function' ? o[k].bind(o) : o[k]) });
  CUES.firmament(quiet, t0, SKY.turnAt);
  const TA = t0 + SKY.turnAt, K0 = TA - MONTAGE.turnAt, E = t0 + SKY.len;
  a.noise(K0, TA - K0 + .05, { filter: 'lowpass', freq: 260, gain: .12, buf: 'brown', attack: .05 });
  a.impact(TA, { gain: .45 });
  a.noise(TA, .42, { filter: 'bandpass', freq: 900, freqTo: 3800, q: .8, gain: .3, attack: .02, curve: 'lin' });
  a.noise(TA + .05, .6, { filter: 'lowpass', freq: 400, freqTo: 120, gain: .25, buf: 'brown', attack: .01 });
  a.sub(29, TA + .12, E - TA - .12, { gain: .3 });
  a.pad([41, 42, 53], TA + .15, E - TA - .15, { gain: .08, type: 'sawtooth', cutoff: 420, attack: .25, release: .05, voices: 2, detune: 12, out: 'dirt' });
  a.click(TA + MONTAGE.seen, { gain: .25 }); a.impact(TA + MONTAGE.seen, { gain: .35 });
}

const which = url.get('takes');
if (which) {
  const takes = [];
  if (which === 'sky') {
    takes.push({ id: 'take_sky', cue: skyPart, shot: { dur: SKY.len, scene: 'm_skytiles', params: { turnAt: SKY.turnAt } } });
  } else if (which === 'montage') {
    const dev = STORY.beats.find((b) => b.id === 'devices');
    dev.shots.forEach((s) => {
      const T = MONTAGE_TAKES[s.scene];
      takes.push({ id: 'take_' + s.scene, cue: montagePart(s.scene, T.len, T.turnAt),
        shot: { dur: T.len, scene: s.scene, params: { ...(s.params || {}), ...(T.params || {}) },
                post: stripPost(s.post, s.scene === 'm_poster') } });
    });
  } else if (which === 'flower') {
    const fl = STORY.beats.find((b) => b.id === 'flower');
    let off = 0;
    fl.shots.forEach((s, k) => {
      const at = off + s.dur / 2;
      takes.push({ id: `take_flower_${String(k).padStart(2, '0')}`, cue: flowerPart(k, fl.shots, off),
        shot: { dur: FLOWER_TAKE, scene: s.scene, params: shiftObj(s.params, at), post: shiftPost(stripPost(s.post), at) } });
      off += s.dur;
    });
  }
  const gate = STORY.beats.find((b) => b.id === 'gate'), fin = STORY.beats.find((b) => b.id === 'fin');
  const beats = [gate];
  takes.forEach((t, i) => {
    CUES[t.id] = t.cue;
    // a short silent black between takes, so no reverb tail or feedback trail crosses into the next
    beats.push({ id: `gap_${i}`, scene: 'black', silence: true, text: null, shots: [{ dur: .5 }] });
    beats.push({ id: t.id, audio: t.id, text: null, shots: [t.shot] });
  });
  beats.push(fin);
  STORY.beats.length = 0;
  STORY.beats.push(...beats);
  // the list the cutter reads: [id, start, dur] from the first gap
  let t = 0;
  window.__TAKES = beats.slice(1, -1).map((b) => { const d = b.shots[0].dur; const r = [b.id, t, d]; t += d; return r; }).filter((r) => r[0].startsWith('take_'));
}

// ?icon — the hallway's pixel flower, large and still, twice (with and without it), for the portfolio card's icon
if (url.has('icon')) {
  const P = { lamp: .3, spot: .9, warm: 0, fogDen: .04, flowerSize: .3, flowerRes: 26, wind: 0, hover: 0, burst: 0, field: 0,
    farLight: .8, exposure: 2 };
  const gate = STORY.beats.find((b) => b.id === 'gate'), fin = STORY.beats.find((b) => b.id === 'fin');
  STORY.beats.length = 0;
  STORY.beats.push(gate,
    { id: 'icon_on', scene: 'hallway', text: null, params: { ...P, flowerOn: 1 }, shots: [{ dur: 1 }] },
    { id: 'icon_off', scene: 'hallway', text: null, params: { ...P, flowerOn: 0 }, shots: [{ dur: 1 }] }, fin);
}

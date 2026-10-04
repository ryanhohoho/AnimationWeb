// model.js — everything that has been changed and not yet saved
//
// Two kinds of change, because they live in two different places:
//
//   GLOBAL  styles (the edits.css model), colours, and the site's identity
//           (the Link & icon tab: names, the link card, the icon). Pure data:
//           undoing one is swapping the data back and re-rendering.
//   PAGE    words, pictures, inserted and deleted elements. They live in the DOM
//           of ONE page, and that DOM is thrown away every time the router
//           renders the page again -- so each one can re-apply itself to a
//           fresh page (`apply(doc)`), and the store replays them whenever
//           their page comes back.
//
// Each change carries the `op` the server needs to write it into the source.
// Undo is a stack of changes; Save sends the ops of everything still on it.

import { fromCss, clone } from "../shared/editsCss.js";

export function createStore({ css, palette, tokens, projects, identity }) {
  const inks = {};
  for (const p of projects) inks[p.slug] = { inkA: p.inkA, ink: p.ink };
  const st = {
    styles: fromCss(css),
    palette: { ...palette },
    tokens: { ...tokens },
    inks,
    // identity.js's four exports, plus `uploads` -- the pictures the tab is
    // cutting from, by token, which live only in this session and are never
    // written to the file (site.js keeps the bytes)
    identity: { ...clone(identity || {}), uploads: { card: null, icon: null } },
    done: [],
    undone: [],
    base: null,
    listeners: new Set()
  };
  st.base = snapshot();

  function snapshot() {
    return JSON.stringify({ s: st.styles, p: st.palette, t: st.tokens, i: st.inks, d: st.identity });
  }
  const emit = () => st.listeners.forEach((f) => f());

  return {
    get styles() { return st.styles; },
    get palette() { return st.palette; },
    get tokens() { return st.tokens; },
    get inks() { return st.inks; },
    get identity() { return st.identity; },
    /** the identity as it was at load or at the last save */
    get savedIdentity() { return JSON.parse(st.base).d; },
    get done() { return st.done; },
    on(f) { st.listeners.add(f); return () => st.listeners.delete(f); },

    /** a change to the global data, as one undoable step */
    global(label, mutate, after) {
      const before = { s: clone(st.styles), p: { ...st.palette }, t: { ...st.tokens }, i: clone(st.inks), d: clone(st.identity) };
      mutate(st);
      const now = { s: clone(st.styles), p: { ...st.palette }, t: { ...st.tokens }, i: clone(st.inks), d: clone(st.identity) };
      const set = (v) => { st.styles = clone(v.s); st.palette = { ...v.p }; st.tokens = { ...v.t }; st.inks = clone(v.i); st.identity = clone(v.d); after(); };
      st.done.push({ label, global: true, do: () => set(now), undo: () => set(before) });
      st.undone = [];
      after();
      emit();
    },

    /** mutate the global data WITHOUT a history step -- a drag in progress */
    live(mutate, after) { mutate(st); after(); },

    /** a change to one page's DOM */
    page(cmd, ctx) {
      if (ctx.page === cmd.page) cmd.apply(ctx.doc);
      st.done.push(cmd);
      st.undone = [];
      emit();
    },

    undo(ctx) {
      const c = st.done.pop();
      if (!c) return null;
      if (c.global) c.undo();
      else if (ctx.page === c.page) c.revert(ctx.doc);
      st.undone.push(c);
      emit();
      return c;
    },
    redo(ctx) {
      const c = st.undone.pop();
      if (!c) return null;
      if (c.global) c.do();
      else if (ctx.page === c.page) c.apply(ctx.doc);
      st.done.push(c);
      emit();
      return c;
    },
    canUndo: () => st.done.length > 0,
    canRedo: () => st.undone.length > 0,

    /** a page has just been rendered: put its unsaved changes back on it */
    replay(page, doc) {
      for (const c of st.done) if (!c.global && c.page === page) {
        try { c.apply(doc); } catch (e) { console.warn("[editor] could not re-apply", c.label, e); }
      }
    },

    /** unsaved steps -- zero when undo has walked everything back */
    dirtyCount() { return this.isDirty() ? st.done.length : 0; },
    isDirty() { return st.done.some((c) => !c.global) || snapshot() !== st.base; },

    /** everything Save needs */
    payload(toCss) {
      const ops = [];
      const last = new Map();   // the same words edited twice are written once
      for (const c of st.done) {
        if (c.global || !c.op || c.dead) continue;
        const op = typeof c.op === "function" ? c.op() : c.op;
        for (const o of [op].flat()) {
          if (!o) continue;
          // the arrangement of the photos is one file: the last state wins
          if (o.type === "photoOrder") {
            if (last.has("photoOrder")) { ops[last.get("photoOrder")] = o; continue; }
            last.set("photoOrder", ops.length);
          }
          if (o.type === "text" || o.type === "inner" || o.type === "attr") {
            const k = `${o.file}:${o.start}:${o.end}`;
            if (last.has(k)) { ops[last.get(k)] = o; continue; }
            last.set(k, ops.length);
          }
          ops.push(o);
        }
      }
      // an edit that ends where it started writes nothing
      for (let i = ops.length - 1; i >= 0; i--) {
        const o = ops[i];
        if ((o.type === "text" || o.type === "inner" || o.type === "attr") && o.value === o.orig) ops.splice(i, 1);
      }
      const base = JSON.parse(st.base);
      const changed = (a, b) => JSON.stringify(a) !== JSON.stringify(b);
      const tokens = {};
      for (const [k, v] of Object.entries(st.tokens)) if (base.t[k] !== v) tokens[k] = v;
      const inks = {};
      for (const [k, v] of Object.entries(st.inks)) if (changed(base.i[k], v)) inks[k] = v;
      return {
        ops,
        css: toCss(st.styles),
        palette: changed(base.p, st.palette) ? st.palette : null,
        tokens: Object.keys(tokens).length ? tokens : null,
        projectInks: Object.keys(inks).length ? inks : null
      };
    },

    /** after a save: this is the new starting point */
    committed() {
      st.done = [];
      st.undone = [];
      st.base = snapshot();
      emit();
    },

    changed: emit
  };
}

// palette.js — THE THREE COLOURS THE PRESS PRINTS WITH, IN ONE PLACE
//
// The paper and the home sheet's two inks used to be written three times: as
// a GLSL const in pressgl.js, as byte arrays in sky.js, and (the paper) as
// --paper in site.css. The comment beside each said "must match the others",
// which is a rule a person has to remember -- and the editor (editor/) now
// changes these, so a rule a person has to remember became a rule a tool
// would break.
//
// So both presses read them from here, and the shader takes the paper as a
// uniform rather than a const. --paper in site.css is still a separate token,
// because CSS cannot import JavaScript; the editor writes both on save, and
// the values below are the ones it writes.
//
// It is a mutable object ON PURPOSE: the editor recolours the live sheet by
// assigning to it and asking the deck to repaint. Nothing on the site itself
// ever writes to it.
//
// The ink notes are the ones that used to sit beside SKY and ROSE in
// pressgl.js: THE INK IS NOT THE COLOUR THAT COMES OUT. Ink A is h 246 in the
// can and prints at h 229-240, centred on her 234; ink B is h 330 in the can
// and prints at h 334-345, centred on her 343. Swatch them and they look
// wrong; print them and they are her. pressgl.js carries the full argument.
export const PALETTE = {
  paper:    "#FFFFFF",   // bone. --paper in styles/site.css is the same value
  homeInkA: "#1A71AF",   // prints as her shiny, h~234
  homeInkB: "#CB64C4"    // prints as her base, h~343
};

/** "#RRGGBB" -> [r, g, b] in 0..1. Cached, because the press asks every draw. */
const cache = new Map();
export function unit(hexStr) {
  let v = cache.get(hexStr);
  if (!v) {
    v = [1, 3, 5].map((i) => parseInt(hexStr.slice(i, i + 2), 16) / 255);
    cache.set(hexStr, v);
  }
  return v;
}

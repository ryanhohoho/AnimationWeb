// arrival.js — WHEN A PAGE MAY START ITS EXPENSIVE PARTS
//
// A page is committed in the middle of a transition (router.js: the paper is
// closing over it), and anything costly it starts there -- a WebGL context
// and its shader, a video decoder, a large module -- is taken out of the
// frames of that transition. On a phone that was the frame drop going into
// every project sheet. So a page puts that work behind afterArrival: it runs
// once the move has finished drawing (ctx.settled, main.js) and one more frame
// has gone out, and not at all if the page was left in the meantime.

export function afterArrival(ctx, fn) {
  const go = () => { if (!ctx?.scope?.disposed) fn(); };
  (ctx?.settled || Promise.resolve()).then(() => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => setTimeout(go, 0));
    else setTimeout(go, 0);
  });
}

Captures of the work go here.

Named by the id each slot asks for (see src/site/media.js). A slot takes the
first file it finds under its id, and a recording beats a still of the same
name — .mp4 .webm .mov .gif .webp .avif .png .jpg, in that order.

  usb-hero          the filled hub, mid-run
  usb-side          a generated tray opened in xTool Studio
  iclicker-hero     the join response in the network panel
  iclicker-side     the poll as a student sees it

Nothing under those ids exists yet, so what ships is the `stand-*` set: art out
of aesthetic-images/, baked by tools/bake_captures.mjs, carrying NO caption
because it is not a picture of the work and this site does not print a label
that is not true. Drop a real file in under the id above, point the sheet at it,
and the stand-in is gone.

A clip also wants `<id>-still.webp` beside it — media.js uses it as the poster,
which covers the flash before the video resolves and the fact that a <video>
with no poster prints blank.

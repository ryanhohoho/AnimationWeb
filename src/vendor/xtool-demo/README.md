# xtool-demo — VENDORED, DO NOT EDIT

FIG. 2 on the USB provisioning sheet: the engraving generator's desktop UI,
built as a library, playing a recording of a real run.

Built elsewhere and copied in. Nothing in this folder is edited by hand — a
change here is lost the next time anyone runs the tool below.

## Regenerating

```bash
cd ../USB-UI/app
npm run build:lib      # -> out/lib/xtool-demo.{js,css}, gated by demo:check
npm run demo:record    # -> demo/recordings/  (re-records the two runs)
cd -
node tools/vendor_demo.mjs
```

## What is here

| file | what |
|---|---|
| `xtool-demo.js` | the ES module. Exports `mountDemo(el, opts)`. |
| `xtool-demo.css` | its stylesheet, **rewritten for a shadow root** — see the tool. |
| `recordings/*.stdout.txt` | two real runs of the generator, against different jigs and different serial counts. |
| `recordings/preview.*.json` | each jig, inspected: the still the viewer shows while it is idle. One per template. |
| `recordings/manifest.json` | what was recorded, when, and with which interpreter. |

## The data

The serials are sequential and synthetic, `X1111111` upward, generated for this
purpose and belonging to nobody. Both runs take theirs off the front of one
sequence, so the counts differ but the numbers never do. The template's phone number is substituted the
same way the transcript's device identifiers are. `npm run demo:check` in the
source repository fails the build on anything of another shape, and
`test/sim.test.js` checks these files again from this side.

Generated 2026-09-22 by `tools/vendor_demo.mjs`.

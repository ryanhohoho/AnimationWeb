# The motion-graphics page's media

Everything under `src/assets/motion/` (and `card-motion-graphics.*` in
`src/assets/media/`) is cut from renders of "let me be a flower"
(`../VisualAudialExperience`). The piece renders itself offline, frame by frame,
with its score rendered by an OfflineAudioContext; nothing was screen-recorded.

The renders are made in a **scratch copy** of that project, never in the project
itself: its own HANDOFF.md asks for exactly this (other sessions work on it), and
the take definitions below are not something it needs to carry.

## 1 · A sandbox copy

```bash
S=/tmp/vae-sandbox
rsync -a --exclude renders --exclude media --exclude blender --exclude references --exclude .git \
  ../VisualAudialExperience/ $S/
ln -s "$(cd ../VisualAudialExperience && pwd)/media" $S/media
mkdir -p $S/renders
cp tools/motion/sandbox_takes.js $S/src/
cp tools/motion/run_takes.sh $S/
(cd $S && patch -p0 < "$OLDPWD/tools/motion/sandbox.patch")   # or apply its three hunks by hand
```

`sandbox.patch` is three small changes, all marked `(sandbox only)`: `main.js`
imports `sandbox_takes.js` and honours `&stop=`; `cues.js` stops typing keys in
clean mode; `render.py` takes `--extra` (URL options) and `--noencode`.

## 2 · Render

```bash
(cd $S && python3 serve.py 5176) &                                   # leave running
(cd $S && python3 -u tools/render.py --port 5176 --out renders/film-full.mp4)   # the film, words and all
bash $S/run_takes.sh                                                 # clean piece + the two sets of takes
```

About 4 minutes each on an M2 Max. `run_takes.sh` leaves `frames_clean/`,
`frames_montage/`, `frames_flower/` and an `audio_*.wav` for each in
`$S/renders`.

What `sandbox_takes.js` renders:

| URL option | what |
|---|---|
| `?clean` | the whole piece with no words: no captions, nothing printed in the picture (except the poster's SCIENCE.), no typing keys. Story beats are cut from this, so their picture and sound are the film's. |
| `?takes=montage` | each devices-montage scene alone at a take length (`MONTAGE_TAKES`), with its own block of the score sized to the take |
| `?takes=flower` | each of the 21 cuts of "A flower." alone for 4 s, the bloom held at the exact moment of the film it comes from |
| `?icon` | the hallway's pixel flower, large and still, on and off (how the card's icon was checked) |

## 3 · Bake

```bash
node tools/bake_motion.mjs --renders $S/renders        # every clip, poster, the contact sheet, the card
node tools/bake_motion.mjs --renders $S/renders --only pool
node tools/bake_motion.mjs --renders $S/renders --card
node tools/motion/credits.mjs ../VisualAudialExperience/CREDITS.md
```

`scenes.json` says which stretch of which render each scene is. The scenes'
**names** are not there: they are in `src/site/motion.js`, beside where each
falls in the film, and the editor edits them.

If the piece's cut changes, the film times in `motion.js` change with it: they
are the piece's own (`src/timing.js` there), printed by

```bash
node --input-type=module -e "import {STORY} from '$S/src/story.js'; let t=0;
  for (const b of STORY.beats){const d=b.shots.reduce((a,s)=>a+(+s.dur||0),0); console.log(b.id,t.toFixed(3)); t+=d}"
```

## The icon

`tools/icons/icon-motion-graphics.png` is the hallway's pixel flower, evaluated
off the piece's own shader function (`hallway.js`, `flower()`, seed .55, wind 0)
on its 26-cell art grid -- the fill only; with its one-pixel outline ring the
silhouette read as a blob. Then `node tools/bake_icons.mjs`.

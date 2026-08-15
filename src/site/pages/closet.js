// pages/closet.js — PROJECT 02
//
// THE WORK
// --------
// An outfit generation engine, and — the harder and more interesting half — a
// judge capable of telling whether its output is any good.
//
// THE ARGUMENT, IN ORDER
// ----------------------
// 1. Every wardrobe app on the market generates outfits by maximising
//    similarity under fixed weights and a fixed piece count. Greedy argmax on
//    "most like what I have already picked" has exactly one global attractor —
//    the item nearest the closet's centroid — so it wins every marginal
//    decision in every outfit. Measured on his own v2: one shawl in 24 of 24
//    outfits, and zero dress outfits from ten dresses.
// 2. v3 inverts it. The statement piece is chosen FIRST and SAMPLED, scored in
//    part by DISTANCE from the centroid — the least average item is the most
//    interesting one. Everything after is chosen to support it, and a piece is
//    added only while it contributes more than it costs. Outfit size stops
//    being an input.
// 3. Then the part that matters: the harness that had been grading all of this
//    scored the collapsed v2 at 91.7/100. So he tested the test. It ranked a
//    human-curated outfit above a random pile of the same clothes 57% of the
//    time — a coin flip — and scored the engine ABOVE real human curation.
// 4. The replacement is learned, and it clears the bar he set for it. The gap
//    it exposes between his engine and real human looks was invisible before.
//
// WHY THE PAGE IS BUILT THIS WAY
// ------------------------------
// Same object as the home sheet: white stock, die-cut, the two-ink print
// showing through the holes, which here are the sheet's own trims. What carries
// the page is the work — a played trace of a real composition, the measurements
// that killed each version, and captures of the thing running.
//
// The second ink is an olive — the one second ink on this site that carries
// neither of the animal's two forms in it, which is the right note for the
// project about how things go together without matching.

import { capture, mountMedia } from "../media.js";
import { createTerm } from "../term.js";

// ── ONE COMPOSITION, PLAYED ────────────────────────────────────────────────
// A generator's surface is not a screenshot, it is its reasoning. This engine
// already emits a role and a plain-language rationale for every piece it picks
// — that is a product feature, the "why this works" panel — so the honest
// figure is that reasoning, running.
const COMPOSE = [
  { t: "&gt; python3 demo_stylist.py --profile korean_street --occasion casual --temp 12", c: "cmd", type: true, wait: 780 },
  { t: "" },
  { t: "  grammar    korean_street   layering 0.8 · waist wanted · texture floor 0.55", c: "k", wait: 90 },
  { t: "  closet     84 items        all three essential zones fillable", c: "k", wait: 620 },
  { t: "" },
  { t: "  HERO", c: "cmd", wait: 240 },
  { t: "    sampled from 84 by statement_power × style_fit × context", c: "k", wait: 340 },
  { t: "    ► washed denim chore jacket                    power 0.81", c: "hit", wait: 300 },
  { t: "        distinctive   0.74   distance FROM the closet centroid", c: "k", wait: 120 },
  { t: "        loudness      0.31", c: "k", wait: 120 },
  { t: "        silhouette    oversized", c: "k", wait: 120 },
  { t: "    2 recent heroes damped — a batch of 6 is 6 different heroes", c: "k", wait: 700 },
  { t: "" },
  { t: "  BLUEPRINT", c: "cmd", wait: 240 },
  { t: "    palette      ground neutral · accent indigo · 1 extra family", c: "k", wait: 130 },
  { t: "    loudness     budget 1.40, hero spends 0.31", c: "k", wait: 130 },
  { t: "    proportion   oversized top → slim lower wanted, waist break wanted", c: "k", wait: 130 },
  { t: "    focal        torso", c: "k", wait: 130 },
  { t: "    needs        COVER_LOWER  COVER_FEET  WAIST  VALUE  TEXTURE  THIRD", c: "k", wait: 760 },
  { t: "" },
  { t: "  CAST", c: "cmd", wait: 240 },
  { t: "    + black tapered trouser        COVER_LOWER .90  WAIST .40    +0.86", c: "hit", wait: 200 },
  { t: '        "slim lower against the oversized jacket, and it defines', c: "k", wait: 60 },
  { t: '         the waist break the grammar asked for"', c: "k", wait: 520 },
  { t: "    + white ribbed crew            VALUE .55  TEXTURE .35        +0.44", c: "hit", wait: 200 },
  { t: '        "lifts a look sitting in one narrow band of lightness"', c: "k", wait: 520 },
  { t: "    + black leather derby          COVER_FEET .90               +0.71", c: "hit", wait: 520 },
  { t: "    – grey wool scarf              THIRD .30   cost .52         −0.22", c: "k", wait: 200 },
  { t: '        "loudness overspend. The jacket already carries the look"', c: "k", wait: 620 },
  { t: "    stop — nothing left contributes more than it costs      4 pieces", c: "cmd", wait: 900 },
  { t: "" },
  { t: "  CRITIQUE", c: "cmd", wait: 240 },
  { t: "    two_focal 0.00   palette_chaos 0.00   value_mush 0.00", c: "k", wait: 140 },
  { t: "    accidental_hem 0.00   proportion_flat 0.18   ← worst", c: "k", wait: 520 },
  { t: "  REVISE", c: "cmd", wait: 240 },
  { t: "    swap  white ribbed crew → cropped white tee    0.18 → 0.04  kept", c: "hit", wait: 800 },
  { t: "" },
  { t: "  look_judge  0.781      human board looks 0.793 · random piles 0.700", c: "k", wait: 1100 }
];

export function html(p) {
  const inkName = (p?.inkName || "OLIVE").replace(/ /g, "&nbsp;");
  return `
  <!-- ══ 00 · TITLE ═══════════════════════════════════════════════════════
       The home sheet's title composition and its trim. -->
  <section class="plate" id="p0">
    <div class="corner tl">
      <p class="t">PROJECT&nbsp;02&nbsp;—&nbsp;CLOSET</p>
      <p class="t dim">ONGOING&nbsp;·&nbsp;ALGORITHM<br />OUTFIT&nbsp;GENERATION&nbsp;·&nbsp;LEARNED&nbsp;JUDGE</p>
    </div>
    <div class="corner tr">
      <p class="t dim"><span data-at>—</span></p>
      <p class="t">2026—</p>
    </div>

    <div class="ap tall" data-ap data-collider style="--x:57%; --y:12%; --w:25%; --h:64%"></div>
    <p class="t dim cap" style="--x:57%; --y:78%">PL.&nbsp;02&nbsp;—&nbsp;CERULEAN&nbsp;+&nbsp;${inkName}</p>

    <div class="corner bl">
      <h1 class="d" data-collider style="max-width:19ch">an outfit engine,<br />and a judge that<br /><em>actually grades it</em></h1>
    </div>
    <div class="corner br">
      <p class="t dim">SIX&nbsp;PLATES.&nbsp;EVERY&nbsp;NUMBER&nbsp;ON&nbsp;THIS&nbsp;SHEET&nbsp;IS&nbsp;MEASURED.</p>
      <p class="t">SCROLL&nbsp;↓</p>
    </div>
  </section>

  <!-- ══ 01 · THE COLLAPSE ════════════════════════════════════════════════
       The problem, as a measurement rather than an opinion. This table is the
       whole reason the project exists. -->
  <section class="plate" id="p1">
    <div class="corner tl">
      <p class="t">01&nbsp;—&nbsp;THE&nbsp;COLLAPSE</p>
      <p class="t dim">WHAT&nbsp;MAXIMISING&nbsp;SIMILARITY&nbsp;ACTUALLY&nbsp;PRODUCES</p>
    </div>
    <div class="corner tr"><p class="t dim"><span data-at>—</span></p></div>

    <div class="spec wide-col" data-collider>
      <p class="t dim">V2,&nbsp;ON&nbsp;A&nbsp;115-ITEM&nbsp;POOL&nbsp;·&nbsp;24&nbsp;OUTFITS</p>
      <dl class="tab">
        <dt>“Contrast trim shawl”</dt><dd>24 / 24</dd>
        <dt>“Sheer high-low skirt”</dt><dd>14 / 24</dd>
        <dt>“Stone faux fur gilet”, worn as a top</dt><dd>13 / 24</dd>
        <dt>dresses, from ten in the pool</dt><dd>0 / 24</dd>
        <dt>casual vs. date, every profile</dt><dd>IDENTICAL</dd>
        <div class="rule"></div>
        <dt>score from the harness grading it</dt><dd class="key">91.7 / 100</dd>
      </dl>
      <p class="t dim body wide">Not a tuning problem. Greedy argmax over “most
        similar to what is already picked” has exactly one global attractor —
        the item nearest the closet's centroid — so that item wins every
        marginal decision in every outfit, forever. Three separate penalties had
        been added on top of it, and none of them worked, because the objective
        is re-maximised from scratch on every step.</p>
      <p class="t dim body wide">The seed was worse. It was chosen by distance to
        the profile centroid, so an outfit could only ever start with one of the
        three <em style="font-style:normal">least distinctive</em> garments in
        the wardrobe — and a dress never sits at a centroid, so once a top was
        seeded, coverage rules blocked every dress for the rest of the build.</p>
    </div>

    <div class="side high">
      <div>
        <p class="t dim">THE&nbsp;RULE&nbsp;IT&nbsp;BROKE</p>
        <p class="t body wide">Human styling does not maximise similarity. It
          maximises interest under control: contrast in colour, texture and
          volume, held together by one idea. Similarity is a weak proxy for
          “these belong to one wardrobe”, and optimising it directly collapses
          the wardrobe to its own average.</p>
      </div>
      <div>
        <p class="t dim">AND&nbsp;THE&nbsp;PIECE&nbsp;COUNT</p>
        <p class="t body wide">Size came from a bar that rose with the number of
          items already worn. The engine added whatever scored highest until an
          arbitrary quota stopped it, and never once asked what a piece
          contributed. That is not a metaphor for the bug — it is what the code
          did, line for line.</p>
      </div>
    </div>
  </section>

  <!-- ══ 02 · THE LOOP ════════════════════════════════════════════════════
       The rebuild, shown as its own reasoning rather than described. -->
  <section class="plate" id="p2">
    <div class="corner tl">
      <p class="t">02&nbsp;—&nbsp;THE&nbsp;STYLIST&nbsp;LOOP</p>
      <p class="t dim">HERO&nbsp;→&nbsp;BLUEPRINT&nbsp;→&nbsp;CAST&nbsp;→&nbsp;CRITIQUE&nbsp;→&nbsp;REVISE</p>
    </div>
    <div class="corner tr"><p class="t dim"><span data-at>—</span></p></div>

    <div class="spec term-col" data-collider>
      <div class="term" data-term><div data-lines></div></div>
      <p class="t dim">FIG.&nbsp;1&nbsp;—&nbsp;ONE&nbsp;COMPOSITION,&nbsp;EXPLAINING&nbsp;ITSELF.</p>
    </div>

    <div class="side high">
      <div>
        <p class="t dim">THE&nbsp;INVERSION</p>
        <p class="t body wide">The statement piece is picked first, and it is
          <em style="font-style:normal">sampled</em> rather than argmaxed — so a
          batch of six is six different heroes by construction. Distance from
          the closet centroid now counts <em style="font-style:normal">for</em> a
          garment instead of against it: the least average item is the most
          interesting one. Anything can headline, including a necklace.</p>
      </div>
      <div>
        <p class="t dim">SIZE&nbsp;IS&nbsp;A&nbsp;RESULT,&nbsp;NOT&nbsp;AN&nbsp;INPUT</p>
        <p class="t body wide">The outfit carries a vector of unmet needs —
          coverage, warmth, value, texture, waist, third piece, an echo of the
          hero's accent. A candidate joins only if what it provides outweighs
          what it costs. A dress with boots and one good necklace stops at three
          because nothing else provides anything; a grey wardrobe on a cold day
          grows to seven because four needs are still open.</p>
      </div>
      <div>
        <p class="t dim">MEASURED&nbsp;AGAINST&nbsp;V2</p>
        <dl class="tab sm">
          <dt>closet coverage</dt><dd>0.53 → 0.68</dd>
          <dt>near-clone outfit pairs</dt><dd>7 → 0</dd>
          <dt>worst outfit, office pool</dt><dd>61 → 73</dd>
        </dl>
        <p class="t body wide">Across six catalogues v3 wins coverage on all six
          and roughly halves the similarity between any two outfits.</p>
      </div>
    </div>
  </section>

  <!-- ══ 03 · THE JUDGE THAT FAILED ═══════════════════════════════════════
       The centre of the page. Everything above was graded by something that
       could not tell curation from a random pile. -->
  <section class="plate deep" id="p3">
    <div class="corner tl">
      <p class="t">03&nbsp;—&nbsp;TESTING&nbsp;THE&nbsp;TEST</p>
      <p class="t dim">THE&nbsp;HARNESS&nbsp;THAT&nbsp;SCORED&nbsp;THE&nbsp;COLLAPSED&nbsp;ENGINE&nbsp;91.7</p>
    </div>
    <div class="corner tr"><p class="t dim"><span data-at>—</span></p></div>

    <div class="spec wide-col" data-collider>
      <p class="t dim body wide">An engine cannot grade itself, so there was an
        independent harness — a stylist-rules judge checking formality spread,
        value mush, mixed metals, print stacking, duplicates. It had scored the
        engine that emitted one outfit twenty-four times at 91.7 out of 100. So
        the next thing to test was the judge.</p>
      <p class="t dim body wide">The experiment: score four hundred real
        human-curated outfits, then score the same garments reshuffled into
        random piles, and see whether the judge can tell them apart.</p>

      <p class="t dim">THE&nbsp;OLD&nbsp;JUDGE,&nbsp;VALIDATED</p>
      <dl class="tab">
        <dt>human-curated outfits</dt><dd>96.27</dd>
        <dt>random piles of the same clothes</dt><dd>94.00</dd>
        <dt>the engine's own output</dt><dd class="key">99.78</dd>
        <div class="rule"></div>
        <dt>human vs. random, AUC</dt><dd class="key">0.573</dd>
      </dl>
      <p class="t dim body wide">Given one curated outfit and one random pile of
        the same clothes, it picked the curated one 57% of the time. A coin flip
        is 50. And it scored the engine <em style="font-style:normal">above real
        human curation</em>, with 97.7% of outfits at a perfect hundred — a
        saturated metric with no headroom, where every further point is
        Goodhart's law rather than a better outfit.</p>
      <p class="t dim body wide">It was demoted to a regression floor, which is
        the one thing it is good for: it does still catch a reintroduced metal
        clash. And a standing rule went in the decision log — no judge is
        allowed to steer engine work until it clears 0.70 against the
        random-pile null.</p>
    </div>

    <div class="side high">
      <div>
        <p class="t dim">THE&nbsp;REPLACEMENT</p>
        <p class="t body wide">Supervision without a rating grind. Every
          published look is a positive; the same garments reshuffled, matched
          for category counts, are a negative — so the model cannot win by
          counting shoes, it has to learn that these particular pieces do not go
          together. A set encoder over image embeddings, judging the whole look
          rather than pairs of items.</p>
        <dl class="tab sm">
          <dt>old rules judge</dt><dd class="key">0.573</dd>
          <dt>learned judge, held out</dt><dd class="key">0.819</dd>
          <dt>one-garment swaps</dt><dd>0.640</dd>
          <dt>transferred to his own board</dt><dd>0.627</dd>
          <div class="rule"></div>
          <dt>the gate it had to clear</dt><dd>0.70</dd>
        </dl>
      </div>
      <div>
        <p class="t dim">WHAT&nbsp;IT&nbsp;IMMEDIATELY&nbsp;EXPOSED</p>
        <dl class="tab sm">
          <dt>real human looks</dt><dd class="key">0.793</dd>
          <dt>this engine</dt><dd>0.755</dd>
          <dt>random piles</dt><dd>0.700</dd>
        </dl>
        <p class="t body wide">The engine sits closer to a random pile than to a
          person. Shown one of its outfits and one real look, the judge prefers
          the human 64% of the time. That gap is the remaining work — and under
          the old harness it was completely invisible, because there the engine
          was already beating humans.</p>
      </div>
      <div>
        <p class="t dim">THE&nbsp;HONEST&nbsp;ASK</p>
        <p class="t body wide">Fine-tuning on his own saved looks is worse than
          not fine-tuning until about a hundred of them, and the curve is still
          climbing at roughly two points per thirty looks — which puts a
          personal judge over the gate somewhere near three to five hundred. So
          that is the number the product asks for, instead of a rating grind
          that buys a few dozen labels and has to be paid again after every
          engine change.</p>
      </div>
    </div>
  </section>

  <!-- ══ 04 · WHAT IT LOOKS LIKE ══════════════════════════════════════════ -->
  <section class="plate deep" id="p4">
    <div class="corner tl">
      <p class="t">04&nbsp;—&nbsp;WHAT&nbsp;IT&nbsp;LOOKS&nbsp;LIKE</p>
      <p class="t dim">THE&nbsp;APP,&nbsp;AND&nbsp;WHAT&nbsp;IT&nbsp;LEARNS&nbsp;FROM</p>
    </div>
    <div class="corner tr"><p class="t dim"><span data-at>—</span></p></div>

    ${capture({
      id: "closet-app",
      pos: "--x:var(--pad); --y:22%; --w:min(38ch,34vw)",
      ratio: "9 / 16",
      cap: "FIG. 2 — A GENERATED LOOK, WITH ITS REASONING.",
      alt: "The Closet iOS app showing a generated outfit and why each piece was chosen"
    })}

    ${capture({
      id: "closet-board",
      pos: "--x:48%; --y:22%; --w:40%",
      ratio: "4 / 3",
      cap: "FIG. 3 — THE REFERENCE BOARD. THE SUPERVISION IS ALREADY IN IT.",
      alt: "A board of saved reference looks imported from Pinterest"
    })}

    <div class="corner br">
      <p class="t dim">PINTEREST&nbsp;IMPORT&nbsp;IS&nbsp;THE&nbsp;OFFICIAL&nbsp;v5&nbsp;API,<br />ON&nbsp;BOARDS&nbsp;THE&nbsp;USER&nbsp;OWNS.&nbsp;NOTHING&nbsp;IS&nbsp;SCRAPED.</p>
    </div>
  </section>

  <!-- ══ 05 · COLOPHON ════════════════════════════════════════════════════ -->
  <section class="plate" id="p5">
    <div class="corner tl"><p class="t">05&nbsp;—&nbsp;COLOPHON</p></div>
    <div class="corner tr"><p class="t dim"><span data-at>—</span></p></div>

    <div class="cols" data-collider>
      <div><p class="t dim">STATUS</p><p class="t body">Ongoing. Engine v3 and
        the learned judge are in; a personal judge is waiting on saved looks.</p></div>
      <div><p class="t dim">STACK</p><p class="t body">Python · FastAPI ·
        Postgres / pgvector · CLIP image tower · a DeepSets set encoder in
        PyTorch · a VLM at intake only, never on the generation path ·
        BiRefNet matting with SAM for interactive refine · native SwiftUI</p></div>
      <div><p class="t dim">A&nbsp;BUG&nbsp;WORTH&nbsp;KEEPING</p><p class="t body">Material
        was matched by substring, so <em style="font-style:normal">lace</em> was
        found inside <em style="font-style:normal">necklace</em> and every
        necklace in the catalogue read as a lace garment — feeding straight into
        the texture-variety rule. Now matched on word boundaries.</p></div>
      <div><p class="t dim">INK</p><p class="t body">The sheet's own blue, which
        is the colour the animal on it turns when she comes up shiny, and an
        olive — the one second ink here with neither of her forms in it.</p></div>
    </div>

    <div class="ap band" data-ap style="--x:0%; --y:69%; --w:100%; --h:14%"></div>
    <p class="t dim cap pad" style="--y:84.5%">PL.&nbsp;05&nbsp;—&nbsp;CERULEAN&nbsp;+&nbsp;${inkName}.&nbsp;FULL&nbsp;BLEED.</p>

    <div class="corner br">
      <p class="t"><a class="link" href="/" data-route>←&nbsp;back&nbsp;to&nbsp;the&nbsp;sheet</a></p>
    </div>
  </section>`;
}

export function mount({ scope }) {
  const el = document.querySelector("[data-term]");
  if (el) window.__TERM__ = createTerm({ scope, el, script: COMPOSE });
  mountMedia(scope);
}

// pages/usb-provisioning.js — the USB provisioning sheet.
//
// WHAT IS NOT ON THIS PAGE
// ------------------------
// No asset numbers, no serials, no volume identifiers, no key material, no
// credentials. The one figure on it that plays a real run, FIG. 2, runs a batch
// of sequential synthetic serials generated for it. The DISCLOSURE cell in the
// colophon says so on the page itself, and it must survive any edit to this
// file.
//
// FIG. 1 IS GONE, by instruction. It was the provisioning tool's recorded
// PowerShell session and the table of timings read off it, and it had become
// the old demo on a sheet whose real figure is FIG. 2. term.js, which played it,
// is kept unimported (its head says why); the substitution rule it lived under
// still binds anything that is ever put back here.
//
// The prose is a PLACEHOLDER, like the other two sheets — the trim lives in
// pages/sheet.js and this file is the words.

import { renderSheet } from "./sheet.js";
import { capture } from "../media.js";
import { mountUsbDemo } from "../usbDemo.js";

export function html(p) {
  return renderSheet(p, {
    headline: "<span style=\"letter-spacing: -4.32432px;\"><b>Laser Processing</b></span>",
    // THE LEAD IS ON PLATE 1, not under the headline. With the hero gone,
    // plate 0 is a title page -- one display line on one screen, which is what
    // the first plate of a two-plate sheet has always been in print. The
    // argument starts where the evidence does. renderSheet takes an empty lead
    // and prints no paragraph for it.
    lead: "",
    notes: [
      { k: "DELIVERED", v: "This application is used daily by the RCMP and has outputted over ten-thousand devices as of September 4th, 2026." },
      { k: "THE HARD PART", v: "The company uses a proprietary industrial laser engraver with no direct access to G-code compatibility. I reverse-engineered the accepted file format and built LaserSO to output files modified to our required specifications in extreme quantities." },
      // THE DISCLOSURE, ON THE PAGE. Not only in a comment: this cell is where a
      // reader is told, and the page must never carry a real run without it.
      // The subtitle that said it a second time went with FIG. 1.
      { k: "DISCLOSURE", v: "Serial numbers, IDs, encryption architecture, volume identifiers, key material or credentials are confidential and have not been shared on this site." }
    ],
    // THE ARGUMENT, and now the whole of plate 1's evidence block. FIG. 1 --
    // the recorded provisioning session and the table of timings read off it
    // -- stood here and was removed as the outdated demo; FIG. 2 above is the
    // figure this sheet is about.
    body: `
    <p data-e="t-hx35" class="t body wide lead">What you saw above is the
      original command-Line interface prototype

      overlayed by the
      current
      production
     
      application.&nbsp;<br>It pulls and erases serial
     
      numbers
     
      from a generated datapool in our backend. Serial numbers are
     
     
 
      mapped to physical jig coordinates by a generator based on template
    
      

      geometry.</p>`,

    // ── THE FIGURE IS THE HERO, which is what `hero` has always meant on this
    // trim: the figure under the headline. It was on plate 1 for one draft and
    // that put the sheet's own aperture and its opening paragraph above it --
    // so a reader landing on the page met two things before the thing the page
    // is about. It is the first object now, and the plate 0 rule in site.css
    // starts it far enough down that most of the window is still below the
    // fold: something to scroll INTO rather than something already arrived.
    hero: `
    <!-- ── FIG. 2 — THE SECOND TOOL, AND THE ONE THAT GOT A FACE ──────────
         A scroll track with a sticky child. The generator's terminal and the
         generator's UI are the same rectangle, playing the same run; the
         terminal is clipped away from the right as the reader goes down the
         track. site/usbDemo.js owns the number, site.css owns everything that
         reads it.

         NO data-ap ANYWHERE IN HERE, and this is the reason to say so out
         loud: a hole is measured where the document LIVES, and everything
         inside a sticky child moves under it. The plate's one aperture is on
         plate 1, below this, and it does not move. -->
    <div data-e="usb-stage-tw6h" class="usb-stage" data-usb-stage>
      <div class="usb-pin">
        <div class="usb-glow" data-usb-light aria-hidden="true"></div>
        <!-- data-noswipe: a shadow root retargets its events to this element,
             so the router's page-swipe would otherwise read a drag across the
             figure as a request to turn the page. -->
        <div class="usb-frame" data-usb-frame data-noswipe>
          <div class="usb-ui" data-usb-ui></div>
          <!-- aria-hidden for the same reason FIG. 1's played body is: at any
               instant this holds a few lines of a run in progress, which is a
               meaningless snapshot to anyone who cannot watch it arrive. The
               sentence underneath says what it is instead. -->
          <div class="usb-cli" data-usb-cli aria-hidden="true">
            <!-- just CLI. It named one jig and one pocket count, and the figure
                 now runs two different fixtures — so the label was wrong half
                 the time, and it was labelling the obvious anyway. -->
            <div class="usb-cli-bar">CLI</div>
            <div class="usb-cli-body" data-usb-lines></div>
          </div>
          <!-- THE POINTER, over both halves. It belongs to the figure rather
               than to the app: the script's cursor has to be visible while the
               terminal is still covering the thing it is pressing, and the
               terminal is not the app's to draw on. -->
          <div class="usb-cursor" data-usb-cursor aria-hidden="true"></div>
        </div>
      </div>
    </div>
    <p class="sr">A recording of the engraving generator being used. An operator
      chooses a jig, chooses whether it is loaded down the columns or across the
      rows, and generates one thousand two hundred and fifty synthetic serials
      into a seventy-five pocket jig; then does it again with a smaller
      eighteen-pocket fixture, three hundred and six serials and the other
      order. The same run is shown twice at once: the command line the
      tool has always had, and the desktop interface built over it. Scrolling
      wipes the terminal away to the left until only the interface is left. It
      plays on its own and cannot be operated.</p>
    <p data-e="t-5z65" class="t dim usb-cap">FIG.&nbsp;2 — THE SAME RUN, TWICE. SCROLL&nbsp;TO&nbsp;CROSS&nbsp;OVER.</p>
    `,

    // NO HERO. It was a piece of reference artwork standing in for a capture
    // that was never taken, and this sheet now has two real figures on it --
    // a played transcript and a running interface. A placeholder above them
    // was the least true thing on the page in the most prominent slot.
    figure: capture({ id: "stand-usb-side", ratio: "0.7069", cls: "narrow",
      alt: "Reference artwork standing in for a capture of the engraver tray.", e: "fig-5cc4" })
  });
}

export function mount({ scope, world, settled, onLeave }) {
  // FIG. 2 is the one live thing on this sheet. It puts its own teardown on the page scope and returns null when the track is not in the
  // markup, which is what the router harness renders. Its expensive parts wait
  // for the page to arrive (settled) and stop as it is left (onLeave).
  const demo = mountUsbDemo({ scope, world, settled, onLeave });
  if (demo) {
    window.__USBDEMO__ = demo;
    scope?.add(() => { if (window.__USBDEMO__ === demo) delete window.__USBDEMO__; });
  }
}
